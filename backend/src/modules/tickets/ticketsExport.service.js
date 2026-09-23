import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatarHoraCurta } from './tickets.constants.js';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const TEMPLATE_PATH = path.join(BACKEND_ROOT, 'assets', 'templates', 'Matriz_Controlo_Diario_TI.xlsx');
const SCRIPT_PATH = path.join(BACKEND_ROOT, 'scripts', 'export-matriz-ti.py');

function simNao(v) {
  return v ? 'Sim' : 'Não';
}

function isoDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error((stderr || stdout || `comando falhou (${code})`).trim()));
    });
  });
}

let pythonCmdCache = null;

async function resolvePython() {
  if (pythonCmdCache) return pythonCmdCache;
  const tries =
    process.platform === 'win32'
      ? [
          ['py', '-3'],
          ['py'],
          ['python'],
          ['python3'],
        ]
      : [['python3'], ['python']];
  let lastErr = null;
  for (const cmd of tries) {
    try {
      await runCommand(cmd[0], [...cmd.slice(1), '-c', 'import openpyxl']);
      pythonCmdCache = cmd;
      return cmd;
    } catch (err) {
      lastErr = err;
    }
  }
  const detalhe = lastErr?.message ? ` (${lastErr.message})` : '';
  const error = new Error(
    `Python com openpyxl é necessário para gerar a matriz Excel original (gráficos, cores e todas as abas).${detalhe}`
  );
  error.status = 500;
  throw error;
}

function payloadFromDashboard(dashboard) {
  return {
    assistencias: (dashboard.assistencias || []).map((a) => ({
      numero: a.numero,
      data: isoDate(a.data),
      tecnico: a.tecnico,
      hora_inicio: formatarHoraCurta(a.hora_inicio),
      hora_fim: formatarHoraCurta(a.hora_fim),
      departamento: a.departamento,
      provincia: a.provincia,
      colaborador_assistido: a.colaborador_assistido,
      tipo_solicitacao: a.tipo_solicitacao,
      problema: a.problema,
      resolucao: a.resolucao,
      estado: a.estado,
      urgencia: simNao(a.urgencia),
      descricao_urgencia: a.descricao_urgencia,
      num_chamadas: a.num_chamadas,
      meio_solicitacao: a.meio_solicitacao,
      observacoes: a.observacoes,
    })),
    projectos: (dashboard.projectos || []).map((p) => ({
      numero: p.numero,
      data: isoDate(p.data),
      responsavel: p.responsavel,
      projecto_sistema: p.projecto_sistema,
      tarefa: p.tarefa,
      data_atribuicao: isoDate(p.data_atribuicao),
      prazo: isoDate(p.prazo),
      fase_actual: p.fase_actual,
      percentagem_conclusao: p.percentagem_conclusao,
      alteracoes_solicitadas: p.alteracoes_solicitadas,
      data_alteracao: isoDate(p.data_alteracao),
      descricao_alteracao: p.descricao_alteracao,
      accao_realizada: p.accao_realizada,
      estado: p.estado,
      observacoes: p.observacoes,
    })),
  };
}

export async function exportarRelatorioDiaExcel(dashboard) {
  const python = await resolvePython();
  const dir = await mkdtemp(path.join(os.tmpdir(), 'matriz-ti-'));
  const jsonPath = path.join(dir, 'data.json');
  const outPath = path.join(dir, 'Matriz_Controlo_Diario_TI.xlsx');
  try {
    await writeFile(jsonPath, JSON.stringify(payloadFromDashboard(dashboard)), 'utf8');
    await runCommand(python[0], [
      ...python.slice(1),
      SCRIPT_PATH,
      '--template',
      TEMPLATE_PATH,
      '--data',
      jsonPath,
      '--output',
      outPath,
    ]);
    const buffer = await readFile(outPath);
    const { de, ate } = dashboard.periodo;
    const slug = de === ate ? de : `${de}_${ate}`;
    return {
      buffer,
      filename: `Matriz_Controlo_Diario_TI_${slug}.xlsx`,
    };
  } catch (err) {
    const error = new Error(err.message || 'Falha ao gerar a matriz Excel');
    error.status = err.status || 500;
    throw error;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
