-- Módulo: Gestão de Consumíveis + PaperCut (MySQL 8+)
-- Executar após print_manager_mysql.sql ou em BD existente.

USE print_manager;

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provincias (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  nome VARCHAR(120) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY provincias_nome_uq (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departamentos_gestao (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  nome VARCHAR(120) NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY dept_gestao_nome_uq (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Consumíveis — registos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumiveis_registos (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  provincia_id CHAR(36) NOT NULL,
  departamento_id CHAR(36) NULL,
  tipo ENUM('papel_a4', 'envelope', 'toner', 'agrafos') NOT NULL,
  quantidade DECIMAL(14, 4) NOT NULL,
  preco_unitario DECIMAL(16, 6) NOT NULL,
  preco_total DECIMAL(18, 6) NOT NULL,
  data_aquisicao DATE NOT NULL,
  data_termino DATE NULL,
  observacoes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY consum_reg_prov_dept_idx (provincia_id, departamento_id),
  KEY consum_reg_tipo_data_idx (tipo, data_aquisicao),
  CONSTRAINT fk_consum_prov FOREIGN KEY (provincia_id) REFERENCES provincias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_consum_dept FOREIGN KEY (departamento_id) REFERENCES departamentos_gestao (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- PaperCut — importações e linhas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS papercut_import_jobs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  usuario_id CHAR(36) NOT NULL,
  provincia_id CHAR(36) NOT NULL,
  departamento_id CHAR(36) NOT NULL,
  nome_lote VARCHAR(255) NULL,
  status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
  total_linhas INT NOT NULL DEFAULT 0,
  linhas_inseridas INT NOT NULL DEFAULT 0,
  linhas_duplicadas INT NOT NULL DEFAULT 0,
  linhas_erro INT NOT NULL DEFAULT 0,
  mensagem_erro TEXT NULL,
  log_processamento TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY papercut_job_user_idx (usuario_id),
  CONSTRAINT fk_pc_job_user FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pc_job_prov FOREIGN KEY (provincia_id) REFERENCES provincias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pc_job_dept FOREIGN KEY (departamento_id) REFERENCES departamentos_gestao (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS papercut_linhas (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  import_job_id CHAR(36) NOT NULL,
  provincia_id CHAR(36) NOT NULL,
  departamento_id CHAR(36) NOT NULL,
  dedup_hash CHAR(64) NOT NULL,
  imprimido_em DATETIME(3) NULL,
  usuario_papercut VARCHAR(255) NULL,
  paginas INT NOT NULL DEFAULT 0,
  copias INT NOT NULL DEFAULT 1,
  impressora VARCHAR(255) NULL,
  documento VARCHAR(512) NULL,
  cliente VARCHAR(255) NULL,
  papel VARCHAR(120) NULL,
  idioma VARCHAR(64) NULL,
  altura_mm INT NULL,
  largura_mm INT NULL,
  duplex TINYINT(1) NOT NULL DEFAULT 0,
  grayscale TINYINT(1) NOT NULL DEFAULT 0,
  tamanho_bytes INT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY papercut_lin_job_idx (import_job_id),
  KEY papercut_lin_data_idx (imprimido_em),
  KEY papercut_lin_user_idx (usuario_papercut(128)),
  CONSTRAINT fk_pc_lin_job FOREIGN KEY (import_job_id) REFERENCES papercut_import_jobs (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pc_lin_prov FOREIGN KEY (provincia_id) REFERENCES provincias (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pc_lin_dept FOREIGN KEY (departamento_id) REFERENCES departamentos_gestao (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY papercut_dedup_escopo_uq (provincia_id, departamento_id, dedup_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
