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

async function columnType(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, table, column]
  );
  return rows[0]?.COLUMN_TYPE || null;
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
  if (!(await tableExists(conn, 'consumiveis_tipos'))) {
    const sqlPath = path.join(root, 'database', 'patch_consumiveis_tipos_lote.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('OK: tabela consumiveis_tipos e seeds aplicados.');
  } else {
    console.log('Já existe: consumiveis_tipos');
    await conn.query(`
      INSERT INTO consumiveis_tipos (id, codigo, nome, unidade, sistema, ordem, ativo)
      SELECT UUID(), v.codigo, v.nome, v.unidade, 1, v.ordem, 1 FROM (
        SELECT 'papel_a4' AS codigo, 'Papel A4' AS nome, 'caixas' AS unidade, 1 AS ordem UNION ALL
        SELECT 'envelope', 'Envelope', 'unidades', 2 UNION ALL
        SELECT 'toner', 'Toner', 'unidades', 3 UNION ALL
        SELECT 'agrafos', 'Agrafos', 'unidades', 4
      ) v
      WHERE NOT EXISTS (SELECT 1 FROM consumiveis_tipos t WHERE t.codigo = v.codigo)
    `);
    await conn.query(`
      INSERT INTO departamentos_gestao (id, nome, ordem, ativo)
      SELECT UUID(), v.nome, v.ordem, 1 FROM (
        SELECT 'Sede' AS nome, 10 AS ordem UNION ALL
        SELECT 'Comercial Maputo', 11
      ) v
      WHERE NOT EXISTS (SELECT 1 FROM departamentos_gestao d WHERE d.nome = v.nome)
    `);
    console.log('OK: seeds de tipos/departamentos verificados.');
  }

  const tipoColType = await columnType(conn, 'consumiveis_registos', 'tipo');
  if (tipoColType && tipoColType.startsWith('enum')) {
    await conn.query(`
      ALTER TABLE consumiveis_registos
        MODIFY COLUMN tipo VARCHAR(64) NOT NULL
    `);
    console.log('OK: coluna tipo convertida de ENUM para VARCHAR(64).');
  } else {
    console.log('Já convertido ou ausente: consumiveis_registos.tipo');
  }

  if (!(await columnExists(conn, 'consumiveis_registos', 'compra_lote_id'))) {
    await conn.query(`
      ALTER TABLE consumiveis_registos
        ADD COLUMN compra_lote_id CHAR(36) NULL AFTER registado_por_id
    `);
    await conn.query(`CREATE INDEX idx_consumivel_compra_lote ON consumiveis_registos(compra_lote_id)`);
    console.log('OK: coluna compra_lote_id adicionada.');
  } else {
    console.log('Já existe: compra_lote_id');
  }

  console.log('\nPatch consumíveis (tipos + lote) aplicado com sucesso.');
} finally {
  await conn.end();
}
