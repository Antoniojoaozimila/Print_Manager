-- Responsável pelo registo de consumível (utilizador autenticado)
ALTER TABLE consumiveis_registos
  ADD COLUMN IF NOT EXISTS registado_por_id CHAR(36) NULL,
  ADD CONSTRAINT fk_consumivel_registado_por FOREIGN KEY (registado_por_id)
    REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consumivel_registado_por ON consumiveis_registos(registado_por_id);
