import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const dbName = process.env.DB_NAME;

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, table, column]
  );
  return Number(rows[0].c) > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbName, table]
  );
  return Number(rows[0].c) > 0;
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: dbName,
  multipleStatements: true,
});

try {
  if (!(await columnExists(conn, 'consumiveis_registos', 'registado_por_id'))) {
    await conn.query(`
      ALTER TABLE consumiveis_registos
        ADD COLUMN registado_por_id CHAR(36) NULL
    `);
    console.log('OK: coluna registado_por_id adicionada.');
  } else {
    console.log('Já existe: registado_por_id');
  }

  const [fks] = await conn.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'consumiveis_registos'
       AND CONSTRAINT_NAME = 'fk_consumivel_registado_por'`,
    [dbName]
  );
  if (!fks.length) {
    await conn.query(`
      ALTER TABLE consumiveis_registos
        ADD CONSTRAINT fk_consumivel_registado_por FOREIGN KEY (registado_por_id)
          REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    console.log('OK: FK fk_consumivel_registado_por criada.');
  }

  const [idx] = await conn.query(
    `SHOW INDEX FROM consumiveis_registos WHERE Key_name = 'idx_consumivel_registado_por'`
  );
  if (!idx.length) {
    await conn.query(
      `CREATE INDEX idx_consumivel_registado_por ON consumiveis_registos(registado_por_id)`
    );
    console.log('OK: índice idx_consumivel_registado_por criado.');
  }

  if (!(await tableExists(conn, 'consumiveis_anexos'))) {
    const sqlPath = path.join(root, 'database', 'patch_consumiveis_anexos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('OK: tabela consumiveis_anexos criada.');
  } else {
    console.log('Já existe: consumiveis_anexos');
  }

  console.log('\nPatches de consumíveis aplicados com sucesso.');
} finally {
  await conn.end();
}
