-- Anexos (cotações, faturas, recibos, comprovativos) por registo de consumível
CREATE TABLE IF NOT EXISTS consumiveis_anexos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  consumivel_registo_id CHAR(36) NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  caminho_relativo VARCHAR(512) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  tamanho_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  documento_tipo ENUM('cotacao', 'fatura', 'recibo', 'comprovativo_pagamento', 'outro') NOT NULL DEFAULT 'outro',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_anexo_consumivel FOREIGN KEY (consumivel_registo_id)
    REFERENCES consumiveis_registos(id) ON DELETE RESTRICT,
  INDEX idx_anexo_registo (consumivel_registo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
