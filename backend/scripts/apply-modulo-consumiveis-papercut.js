import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const schema = path.join(root, 'database', 'modulo_consumiveis_papercut.sql');
const seed = path.join(root, 'database', 'modulo_consumiveis_papercut_seed.sql');

console.log('Schema…');
await conn.query(fs.readFileSync(schema, 'utf8'));
console.log('Seed…');
await conn.query(fs.readFileSync(seed, 'utf8'));
await conn.end();
console.log('Concluído.');
