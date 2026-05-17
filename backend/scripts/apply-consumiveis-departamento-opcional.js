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
  multipleStatements: true,
});

const sql = `
ALTER TABLE consumiveis_registos DROP FOREIGN KEY fk_consum_dept;
ALTER TABLE consumiveis_registos MODIFY COLUMN departamento_id CHAR(36) NULL;
ALTER TABLE consumiveis_registos
  ADD CONSTRAINT fk_consum_dept FOREIGN KEY (departamento_id) REFERENCES departamentos_gestao (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
`;

try {
  await conn.query(sql);
  console.log('OK: departamento_id em consumiveis_registos é opcional (NULL permitido).');
} catch (e) {
  if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY' || e.message?.includes('check that column/key exists')) {
    console.log('Aviso:', e.message);
  } else {
    throw e;
  }
}

await conn.end();
