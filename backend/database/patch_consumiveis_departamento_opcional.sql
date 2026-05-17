-- Consumíveis: compra a nível de província/balcão — departamento deixa de ser obrigatório.
USE print_manager;

ALTER TABLE consumiveis_registos
  MODIFY COLUMN departamento_id CHAR(36) NULL,
  DROP FOREIGN KEY fk_consum_dept;

ALTER TABLE consumiveis_registos
  ADD CONSTRAINT fk_consum_dept FOREIGN KEY (departamento_id) REFERENCES departamentos_gestao (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
