-- Aplicar em bases MySQL já criadas (antes desta funcionalidade).
-- Ignorar erro se a coluna/índice já existir.

USE print_manager;

ALTER TABLE usuarios
  ADD COLUMN identificador_externo VARCHAR(320) NULL
  COMMENT 'Chave Windows (ex.: DOMINIO\\user) para provisão automática'
  AFTER nome;

CREATE UNIQUE INDEX usuarios_identificador_externo_uq ON usuarios (identificador_externo);
