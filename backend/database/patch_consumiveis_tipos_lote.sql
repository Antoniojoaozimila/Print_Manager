-- Tipos dinâmicos de consumíveis, registo em lote e novos departamentos

CREATE TABLE IF NOT EXISTS consumiveis_tipos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  codigo VARCHAR(64) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  unidade VARCHAR(40) NULL,
  sistema TINYINT(1) NOT NULL DEFAULT 0,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_consumivel_tipo_codigo (codigo),
  KEY idx_consumivel_tipo_ativo (ativo, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO consumiveis_tipos (id, codigo, nome, unidade, sistema, ordem, ativo)
SELECT UUID(), v.codigo, v.nome, v.unidade, 1, v.ordem, 1 FROM (
  SELECT 'papel_a4' AS codigo, 'Papel A4' AS nome, 'caixas' AS unidade, 1 AS ordem UNION ALL
  SELECT 'envelope', 'Envelope', 'unidades', 2 UNION ALL
  SELECT 'toner', 'Toner', 'unidades', 3 UNION ALL
  SELECT 'agrafos', 'Agrafos', 'unidades', 4
) v
WHERE NOT EXISTS (SELECT 1 FROM consumiveis_tipos t WHERE t.codigo = v.codigo);

INSERT INTO departamentos_gestao (id, nome, ordem, ativo)
SELECT UUID(), v.nome, v.ordem, 1 FROM (
  SELECT 'Sede' AS nome, 10 AS ordem UNION ALL
  SELECT 'Comercial Maputo', 11
) v
WHERE NOT EXISTS (SELECT 1 FROM departamentos_gestao d WHERE d.nome = v.nome);
