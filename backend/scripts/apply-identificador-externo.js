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

try {
  await conn.execute(
    "ALTER TABLE usuarios ADD COLUMN identificador_externo VARCHAR(320) NULL COMMENT 'Chave Windows (coleta)' AFTER nome"
  );
  console.log('Coluna identificador_externo criada.');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') console.log('Coluna identificador_externo já existia.');
  else throw e;
}

try {
  await conn.execute(
    'CREATE UNIQUE INDEX usuarios_identificador_externo_uq ON usuarios (identificador_externo)'
  );
  console.log('Índice usuarios_identificador_externo_uq criado.');
} catch (e) {
  if (e.code === 'ER_DUP_KEYNAME') console.log('Índice usuarios_identificador_externo_uq já existia.');
  else throw e;
}

await conn.end();
console.log('Concluído.');
