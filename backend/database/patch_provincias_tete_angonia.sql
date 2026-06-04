-- Províncias Tete e Angonia (importação PaperCut / consumíveis)
USE print_manager;

INSERT INTO provincias (nome, ordem, ativo)
SELECT v.nome, v.ordem, 1 FROM (
  SELECT 'Tete' AS nome, 13 AS ordem
  UNION ALL SELECT 'Angonia', 14
) v
WHERE NOT EXISTS (SELECT 1 FROM provincias p WHERE p.nome = v.nome);
