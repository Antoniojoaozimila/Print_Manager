-- =============================================================================
-- Print Manager — criação da base de dados e tabelas (MySQL / MySQL Workbench)
-- Recomendado: MySQL 8.0.13+ (usa DEFAULT (UUID()) em chaves primárias)
-- Charset: utf8mb4
-- =============================================================================

CREATE DATABASE IF NOT EXISTS print_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE print_manager;

-- Remover tabelas se já existirem (ordem: dependentes primeiro)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS logs_sistema;
DROP TABLE IF EXISTS consumo_mensal;
DROP TABLE IF EXISTS jobs_impressao;
DROP TABLE IF EXISTS impressoras;
DROP TABLE IF EXISTS usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- usuarios
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  nome VARCHAR(200) NOT NULL,
  identificador_externo VARCHAR(320) NULL COMMENT 'Chave Windows (ex.: DOMINIO\\user) para provisão automática',
  email VARCHAR(255) NOT NULL,
  departamento VARCHAR(120) NULL,
  cargo VARCHAR(120) NULL,
  token_acesso VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY usuarios_email_uq (email),
  UNIQUE KEY usuarios_token_uq (token_acesso),
  UNIQUE KEY usuarios_identificador_externo_uq (identificador_externo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- impressoras
-- -----------------------------------------------------------------------------
CREATE TABLE impressoras (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  nome VARCHAR(200) NOT NULL,
  localizacao VARCHAR(255) NULL,
  ip_rede VARCHAR(45) NULL,
  tipo ENUM('central', 'balcao') NOT NULL DEFAULT 'balcao',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_heartbeat DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- jobs_impressao
-- -----------------------------------------------------------------------------
CREATE TABLE jobs_impressao (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  usuario_id CHAR(36) NOT NULL,
  impressora_id CHAR(36) NULL,
  data_hora DATETIME(3) NOT NULL,
  num_paginas INT NOT NULL DEFAULT 1,
  num_copias INT NOT NULL DEFAULT 1,
  colorido TINYINT(1) NOT NULL DEFAULT 0,
  duplex TINYINT(1) NOT NULL DEFAULT 0,
  tamanho_papel VARCHAR(32) NULL,
  formato_arquivo VARCHAR(32) NULL,
  tamanho_kb INT NULL,
  nome_arquivo VARCHAR(512) NULL,
  nome_usuario_exibicao VARCHAR(200) NULL,
  computador_origem VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY jobs_usuario_data_idx (usuario_id, data_hora),
  CONSTRAINT fk_jobs_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_jobs_impressora FOREIGN KEY (impressora_id) REFERENCES impressoras (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- consumo_mensal
-- -----------------------------------------------------------------------------
CREATE TABLE consumo_mensal (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  usuario_id CHAR(36) NOT NULL,
  mes_ano DATE NOT NULL COMMENT 'Primeiro dia do mês (ex.: 2026-05-01)',
  total_paginas INT NOT NULL DEFAULT 0,
  total_coloridas INT NOT NULL DEFAULT 0,
  total_pb INT NOT NULL DEFAULT 0,
  total_duplex INT NOT NULL DEFAULT 0,
  custo_estimado DECIMAL(12, 4) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY consumo_usuario_mes_uq (usuario_id, mes_ano),
  CONSTRAINT fk_consumo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- logs_sistema
-- -----------------------------------------------------------------------------
CREATE TABLE logs_sistema (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  usuario_id CHAR(36) NULL,
  acao VARCHAR(120) NOT NULL,
  detalhes JSON NULL,
  ip_origem VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY logs_created_idx (created_at),
  CONSTRAINT fk_logs_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- (Opcional) Utilizador administrador inicial
-- Login: admin@empresa.local  |  Senha: Admin@123
-- Altere a senha após o primeiro acesso. Guarde o token_acesso para testes API.
-- =============================================================================
INSERT INTO usuarios (
  id,
  nome,
  email,
  departamento,
  cargo,
  token_acesso,
  password_hash,
  ativo,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Administrador',
  'admin@empresa.local',
  'TI',
  'Admin',
  CONCAT(REPLACE(UUID(), '-', ''), SUBSTRING(REPLACE(UUID(), '-', ''), 1, 32)),
  '$2a$10$3pnrLv8ohN/PXo5UXcRi3Oew5Ddz7IfCObrcmZpFkArAIdDr8MDTW',
  1,
  'admin',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);

-- =============================================================================
-- Módulo adicional: consumíveis de escritório + PaperCut — ver ficheiro:
--   database/modulo_consumiveis_papercut.sql
--   database/modulo_consumiveis_papercut_seed.sql
-- Ou: npm run gestao:apply (na pasta backend)
-- =============================================================================

-- =============================================================================
-- Fim
-- =============================================================================
