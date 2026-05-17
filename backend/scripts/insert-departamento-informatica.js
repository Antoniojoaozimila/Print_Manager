import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
});

const [result] = await conn.execute(
  `INSERT INTO departamentos_gestao (nome, ordem, ativo)
   SELECT 'Informática', 9, 1 FROM DUAL
   WHERE NOT EXISTS (
     SELECT 1 FROM departamentos_gestao WHERE nome IN ('Informática', 'Informatica')
   )`
);

console.log('Linhas inseridas:', result.affectedRows);
const [rows] = await conn.execute(
  "SELECT id, nome, ordem, ativo FROM departamentos_gestao WHERE nome = 'Informática'"
);
console.log('Registo:', rows);

await conn.end();
