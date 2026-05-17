USE print_manager;

INSERT INTO provincias (nome, ordem, ativo)
SELECT v.nome, v.ordem, 1 FROM (
  SELECT 'Maputo' AS nome, 1 AS ordem UNION ALL SELECT 'Matola', 2 UNION ALL SELECT 'Xai-Xai', 3
  UNION ALL SELECT 'Chókwè', 4 UNION ALL SELECT 'Maxixe', 5 UNION ALL SELECT 'Beira', 6
  UNION ALL SELECT 'Chimoio', 7 UNION ALL SELECT 'Quelimane', 8 UNION ALL SELECT 'Lichinga', 9
  UNION ALL SELECT 'Nacala', 10 UNION ALL SELECT 'Nampula', 11 UNION ALL SELECT 'Pemba', 12
) v
WHERE NOT EXISTS (SELECT 1 FROM provincias p WHERE p.nome = v.nome);

INSERT INTO departamentos_gestao (nome, ordem, ativo)
SELECT v.nome, v.ordem, 1 FROM (
  SELECT 'Subscrição' AS nome, 1 AS ordem UNION ALL SELECT 'Recursos Humanos', 2
  UNION ALL SELECT 'Risco e Conformidade', 3 UNION ALL SELECT 'Comercial', 4
  UNION ALL SELECT 'Jurídico', 5 UNION ALL SELECT 'Sinistros', 6
  UNION ALL SELECT 'Contabilidade', 7 UNION ALL SELECT 'Credit Control', 8
  UNION ALL SELECT 'Informática', 9
) v
WHERE NOT EXISTS (SELECT 1 FROM departamentos_gestao d WHERE d.nome = v.nome);
