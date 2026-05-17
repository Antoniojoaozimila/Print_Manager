/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const SEEN_PATH = path.join(__dirname, '..', 'data', 'seen-jobs.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Crie config.json a partir de config.example.json');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readSeen() {
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeSeen(obj) {
  ensureDir(path.dirname(SEEN_PATH));
  fs.writeFileSync(SEEN_PATH, JSON.stringify(obj, null, 0), 'utf8');
}

function extFromName(name) {
  if (!name || typeof name !== 'string') return null;
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : null;
}

function runPrinterDiscovery() {
  return new Promise((resolve, reject) => {
    const script = [
      '$ErrorActionPreference = "SilentlyContinue"',
      '$printers = Get-CimInstance Win32_Printer',
      '$out = foreach ($p in $printers) {',
      '  $ip = $null',
      '  $pn = $p.PortName',
      '  if ($pn -match "(\\d+\\.\\d+\\.\\d+\\.\\d+)") { $ip = $Matches[1] }',
      '  [PSCustomObject]@{ Name = $p.Name; PortName = $pn; IpAddress = $ip }',
      '}',
      '$out | ConvertTo-Json -Compress -Depth 3',
    ].join('\r\n');

    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    ps.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    ps.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `powershell printers ${code}`));
      try {
        if (!stdout.trim()) return resolve([]);
        const parsed = JSON.parse(stdout);
        resolve(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function runPrintJobProbe() {
  return new Promise((resolve, reject) => {
    const script = [
      '$ErrorActionPreference = "SilentlyContinue"',
      '$jobs = Get-CimInstance Win32_PrintJob',
      '$out = foreach ($j in $jobs) {',
      '  [PSCustomObject]@{',
      '    JobId = $j.JobId',
      '    Name = $j.Name',
      '    Document = $j.Document',
      '    Owner = $j.Owner',
      '    TotalPages = [int]($j.TotalPages)',
      '    PagesPrinted = [int]($j.PagesPrinted)',
      '    Color = [bool]($j.Color)',
      '    Size = [int]($j.Size)',
      '    PaperLength = $j.PaperLength',
      '    PaperWidth = $j.PaperWidth',
      '  }',
      '}',
      '$out | ConvertTo-Json -Compress -Depth 3',
    ].join('\r\n');

    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    ps.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    ps.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `powershell ${code}`));
      try {
        if (!stdout.trim()) return resolve([]);
        const parsed = JSON.parse(stdout);
        resolve(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function flushQueue(cfg, client) {
  const dir = path.resolve(cfg.queueDir || './offline-queue');
  if (!fs.existsSync(dir)) return;
  const files = await fs.promises.readdir(dir);
  for (const f of files.sort()) {
    if (!f.endsWith('.json')) continue;
    const full = path.join(dir, f);
    try {
      const body = JSON.parse(await fs.promises.readFile(full, 'utf8'));
      await client.post('/collect/jobs', body, {
        headers: { 'X-Collector-Token': cfg.collectorToken },
      });
      await fs.promises.unlink(full);
      console.log('Fila offline enviada:', f);
    } catch (e) {
      console.warn('Ainda offline ou erro ao enviar fila:', e.message);
      break;
    }
  }
}

function getPrinterSyncIntervalMs(cfg) {
  const raw = cfg.printerSyncIntervalMs;
  if (raw === 0) return 0;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return 120000;
}

async function syncPrintersToApi(cfg, client, printerState) {
  const interval = getPrinterSyncIntervalMs(cfg);
  if (interval === 0) return;
  const now = Date.now();
  if (printerState.lastPrinterSync && now - printerState.lastPrinterSync < interval) return;

  const raw = await runPrinterDiscovery();
  const printers = [];
  const map = {};
  for (const p of raw) {
    const nome = p.Name ? String(p.Name).trim() : '';
    if (!nome) continue;
    const ip = p.IpAddress ? String(p.IpAddress).trim() : '';
    printers.push({ nome, ip_rede: ip || null, localizacao: null });
    if (ip) map[nome] = ip;
  }
  printerState.printerIpByName = map;
  printerState.lastPrinterSync = now;

  try {
    await client.post('/collect/printers', { printers }, {
      headers: { 'X-Collector-Token': cfg.collectorToken },
    });
    console.log('Impressoras sincronizadas:', printers.length);
  } catch (e) {
    console.warn('Falha ao sincronizar impressoras:', e.message);
  }
}

async function sendJobs(cfg, client, jobsPayload) {
  const body = { jobs: jobsPayload };
  try {
    await client.post('/collect/jobs', body, {
      headers: { 'X-Collector-Token': cfg.collectorToken },
    });
  } catch (e) {
    const dir = path.resolve(cfg.queueDir || './offline-queue');
    ensureDir(dir);
    const fname = path.join(dir, `batch-${Date.now()}.json`);
    await fs.promises.writeFile(fname, JSON.stringify(body), 'utf8');
    console.warn('Sem conexão — gravado em fila offline:', fname);
  }
}

async function tick(cfg, client, seen, printerState) {
  await flushQueue(cfg, client);
  await syncPrintersToApi(cfg, client, printerState);

  const host = os.hostname();
  const rows = await runPrintJobProbe();
  const batch = [];
  const ipMap = printerState.printerIpByName || {};

  for (const j of rows) {
    const key = `${j.Name || ''}:${j.JobId}`;
    if (seen[key]) continue;
    if (!j.TotalPages && !j.PagesPrinted) continue;

    seen[key] = Date.now();
    const pages = Math.max(j.TotalPages || j.PagesPrinted || 1, 1);
    const doc = j.Document || j.Name || 'documento';
    const ext = extFromName(doc);
    const impressoraNome = j.Name || null;
    const impressoraIp = impressoraNome && ipMap[impressoraNome] ? ipMap[impressoraNome] : null;

    batch.push({
      data_hora: new Date().toISOString(),
      identificador_windows: j.Owner ? String(j.Owner).trim() : null,
      nome_usuario_exibicao: j.Owner || null,
      nome_arquivo: doc,
      num_paginas: pages,
      num_copias: 1,
      colorido: Boolean(j.Color),
      duplex: false,
      tamanho_papel: j.PaperLength && j.PaperWidth ? `custom:${j.PaperLength}x${j.PaperWidth}` : 'A4',
      formato_arquivo: ext,
      tamanho_kb: j.Size ? Math.max(1, Math.round(j.Size / 1024)) : null,
      computador_origem: host,
      impressora_nome: impressoraNome,
      impressora_ip: impressoraIp,
    });
  }

  if (batch.length) {
    await sendJobs(cfg, client, batch);
    writeSeen(seen);
  }
}

async function main() {
  const cfg = loadConfig();
  const client = axios.create({
    baseURL: cfg.apiBaseUrl.replace(/\/$/, ''),
    timeout: 20000,
  });
  const interval = Math.max(3000, Number(cfg.pollIntervalMs) || 8000);
  let seen = readSeen();
  const printerState = { lastPrinterSync: 0, printerIpByName: {} };

  console.log('Print Manager Coletor iniciado. Intervalo:', interval, 'ms');

  setInterval(async () => {
    try {
      await tick(cfg, client, seen, printerState);
    } catch (e) {
      console.warn('Ciclo:', e.message);
    }
  }, interval);

  try {
    await tick(cfg, client, seen, printerState);
  } catch (e) {
    console.warn('Primeiro ciclo:', e.message);
  }
}

main();
