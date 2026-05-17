import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..', '..');

function loadFile(p) {
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

loadFile(path.join(backendRoot, '.env'));
loadFile(path.join(process.cwd(), '.env'));

function buildMysqlUrl() {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASSWORD ?? '';
  if (!name || !user) return null;
  const enc = encodeURIComponent;
  return `mysql://${enc(user)}:${enc(pass)}@${host}:${port}/${enc(name)}`;
}

if (!process.env.DATABASE_URL?.trim()) {
  const built = buildMysqlUrl();
  if (built) process.env.DATABASE_URL = built;
}
