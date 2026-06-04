/**
 * Payload de demonstração — volumes e listas fictícias para pré-visualizar modelos de relatório
 * (PDF / Excel / Word) sem depender de importações PaperCut na base de dados.
 */
export function obterDadosRelatorioDemo() {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;

  return {
    periodo: { ano, mes },
    demo: true,
    totais: {
      folhas: 482_650,
      paginas: 318_400,
      copias: 124_800,
      jobs: 9_842,
      folhas_duplex: 215_400,
      folhas_gray: 248_900,
      folhas_cor_ou_nao_gray: 233_750,
      resmas: 965.3,
      caixas: 193.06,
    },
    financeiro: {
      custo_mes_real_mzn: 412_500,
      gasto_aquisicoes_consumiveis_mes: 412_500,
      gasto_papel_aquisicoes_mzn: 285_000,
      gasto_toner_aquisicoes_mzn: 127_500,
      preco_por_caixa_mzn: 18_500,
      preco_por_unidade_toner_mzn: 42_500,
    },
    resumo_consumiveis_mes: { num_registos: 18, total_mzn: 412_500 },
    por_departamento: [
      { departamento: 'Sinistros', folhas: 98_400, resmas: 196.8, caixas: 39.36 },
      { departamento: 'Subscrições — Particulares', folhas: 86_200, resmas: 172.4, caixas: 34.48 },
      { departamento: 'Subscrições — Empresarial', folhas: 72_100, resmas: 144.2, caixas: 28.84 },
      { departamento: 'Financeiro', folhas: 54_800, resmas: 109.6, caixas: 21.92 },
      { departamento: 'TI / Operações', folhas: 48_200, resmas: 96.4, caixas: 19.28 },
    ],
    por_provincia: [
      { provincia: 'Maputo', folhas: 168_200, aquisicoes_mes_mzn: 152_000, gasto_papel_aquisicoes_mzn: 110_000, gasto_toner_aquisicoes_mzn: 42_000 },
      { provincia: 'Matola', folhas: 92_400, aquisicoes_mes_mzn: 88_500, gasto_papel_aquisicoes_mzn: 65_000, gasto_toner_aquisicoes_mzn: 23_500 },
      { provincia: 'Gaza', folhas: 48_300, aquisicoes_mes_mzn: 42_000, gasto_papel_aquisicoes_mzn: 30_000, gasto_toner_aquisicoes_mzn: 12_000 },
    ],
    top_usuarios: [
      { usuario_papercut: 'demo.user1', folhas: 12_400 },
      { usuario_papercut: 'demo.user2', folhas: 9_800 },
    ],
    top_impressoras: [{ impressora: 'HP-DEMO-01', folhas: 45_000 }],
    consumiveis_aquisicao_no_mes: [
      {
        provincia: 'Maputo',
        tipo: 'papel_a4',
        quantidade: 10,
        preco_unitario: 11_000,
        preco_total: 110_000,
        data_aquisicao: `${ano}-${String(mes).padStart(2, '0')}-05`,
      },
    ],
    utilizadores: [],
    resumo_utilizadores_mes: { num_utilizadores: 0, total_impressoes: 0, total_folhas: 0 },
  };
}
