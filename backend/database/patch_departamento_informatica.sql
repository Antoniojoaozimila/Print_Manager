-- Executar na base print_manager se já tinha os departamentos antigos sem Informática.
USE print_manager;

INSERT INTO departamentos_gestao (nome, ordem, ativo)
SELECT 'Informática', 9, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM departamentos_gestao WHERE nome IN ('Informática', 'Informatica')
);
