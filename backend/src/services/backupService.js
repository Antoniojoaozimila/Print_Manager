import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import cron from 'node-cron';
import { logger } from '../config/logger.js';

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    return {
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      host: u.hostname,
      port: u.port || '3306',
      database: u.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
}

function runMySqlDump(destFile) {
  return new Promise((resolve, reject) => {
    const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
    if (!cfg) {
      return reject(new Error('DATABASE_URL inválida'));
    }
    const args = ['-h', cfg.host, '-P', cfg.port, '-u', cfg.user, cfg.database];
    const child = spawn('mysqldump', args, {
      env: { ...process.env, MYSQL_PWD: cfg.password },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const out = fs.createWriteStream(destFile);
    child.stdout.pipe(out);
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `mysqldump saiu com código ${code}`));
    });
  });
}

async function executarBackup() {
  const dir = path.resolve(process.env.BACKUP_DIR || './storage/backups');
  await fs.promises.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(dir, `backup-${stamp}.sql`);
  await runMySqlDump(dest);
  logger.info({ msg: 'Backup concluído', dest });
  return dest;
}

function agendarBackup() {
  const expr = process.env.BACKUP_CRON || '0 2 * * *';
  if (process.env.DISABLE_BACKUP === 'true') return;
  cron.schedule(expr, async () => {
    try {
      await executarBackup();
    } catch (e) {
      logger.error({ msg: 'Falha no backup agendado', err: e.message });
    }
  });
  logger.info({ msg: 'Agendamento de backup ativo', cron: expr });
}

export { executarBackup, agendarBackup };
