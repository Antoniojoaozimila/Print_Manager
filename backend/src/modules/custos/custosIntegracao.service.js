import { Op, fn, col } from 'sequelize';
import models from '../../models/index.js';
import {
  FOLHAS_POR_CAIXA_A4,
  FOLHAS_POR_RESMA_A4,
  RESMAS_POR_CAIXA_A4,
  folhasParaUnidadesA4,
  estimativaTonerRelativa,
} from '../consumiveis/consumiveis.constants.js';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(v) {
  return Math.round(num(v) * 100) / 100;
}

function round4(v) {
  return Math.round(num(v) * 10000) / 10000;
}

/** Preços de referência a partir dos consumíveis cadastrados (com fallback env). */
export async function obterPrecosReferencia({ provinciaId, de, ate } = {}) {
  const whereBase = {};
  if (provinciaId) whereBase.provincia_id = provinciaId;
  if (de && ate) whereBase.data_aquisicao = { [Op.between]: [de, ate] };

  const wherePapel = { ...whereBase, tipo: 'papel_a4' };
  const whereToner = { ...whereBase, tipo: 'toner' };

  const [papelAgg, tonerAgg, ultimoPapel, ultimoToner] = await Promise.all([
    models.ConsumivelRegisto.findOne({
      where: wherePapel,
      attributes: [
        [fn('SUM', col('quantidade')), 'caixas'],
        [fn('SUM', col('preco_total')), 'total_mzn'],
        [fn('AVG', col('preco_unitario')), 'media_preco_caixa'],
      ],
      raw: true,
    }),
    models.ConsumivelRegisto.findOne({
      where: whereToner,
      attributes: [
        [fn('SUM', col('quantidade')), 'unidades'],
        [fn('SUM', col('preco_total')), 'total_mzn'],
        [fn('AVG', col('preco_unitario')), 'media_preco_unidade'],
      ],
      raw: true,
    }),
    models.ConsumivelRegisto.findOne({
      where: { tipo: 'papel_a4', ...(provinciaId ? { provincia_id: provinciaId } : {}) },
      order: [['data_aquisicao', 'DESC']],
      attributes: ['preco_unitario', 'data_aquisicao'],
      raw: true,
    }),
    models.ConsumivelRegisto.findOne({
      where: { tipo: 'toner', ...(provinciaId ? { provincia_id: provinciaId } : {}) },
      order: [['data_aquisicao', 'DESC']],
      attributes: ['preco_unitario', 'data_aquisicao'],
      raw: true,
    }),
  ]);

  const caixas = num(papelAgg?.caixas);
  const precoCaixaPeriodo = num(papelAgg?.media_preco_caixa);
  const precoCaixaUltimo = num(ultimoPapel?.preco_unitario);
  const precoCaixa =
    caixas > 0 && precoCaixaPeriodo > 0
      ? precoCaixaPeriodo
      : precoCaixaUltimo > 0
        ? precoCaixaUltimo
        : parseFloat(process.env.PRECO_CAIXA_A4_MZN || '0') ||
          parseFloat(process.env.PRECO_FOLHA_MZN || '0.15') * FOLHAS_POR_CAIXA_A4;

  const precoTonerPeriodo = num(tonerAgg?.media_preco_unidade);
  const precoTonerUltimo = num(ultimoToner?.preco_unitario);
  const precoTonerUn =
    num(tonerAgg?.unidades) > 0 && precoTonerPeriodo > 0
      ? precoTonerPeriodo
      : precoTonerUltimo > 0
        ? precoTonerUltimo
        : parseFloat(process.env.PRECO_TONER_ESTIMADO_MZN || '5000');

  const precoPorFolha = precoCaixa / FOLHAS_POR_CAIXA_A4;
  const precoPorResma = precoCaixa / RESMAS_POR_CAIXA_A4;

  const fonte =
    (caixas > 0 && precoCaixaPeriodo > 0) || precoCaixaUltimo > 0 ? 'consumiveis' : 'fallback';

  return {
    fonte,
    preco_por_caixa_mzn: round4(precoCaixa),
    preco_por_resma_mzn: round4(precoPorResma),
    preco_por_folha_mzn: round4(precoPorFolha),
    preco_por_unidade_toner_mzn: round4(precoTonerUn),
    registos_papel_no_periodo: caixas,
    registos_toner_no_periodo: num(tonerAgg?.unidades),
    regra_papel: {
      folhas_por_resma: FOLHAS_POR_RESMA_A4,
      resmas_por_caixa: RESMAS_POR_CAIXA_A4,
      folhas_por_caixa: FOLHAS_POR_CAIXA_A4,
    },
  };
}

/** Custos de impressão com base nos preços reais dos consumíveis. */
export function calcularCustosImpressao({
  folhas,
  folhas_gray = 0,
  folhas_cor = 0,
  folhas_duplex = 0,
  precos,
}) {
  const f = num(folhas);
  const unidades = folhasParaUnidadesA4(f);
  const tonerIdx = estimativaTonerRelativa({
    paginas: f,
    coloridas: num(folhas_cor),
    grayscale: num(folhas_gray),
    duplex: num(folhas_duplex),
  });
  const precoFolha = num(precos?.preco_por_folha_mzn);
  const precoToner = num(precos?.preco_por_unidade_toner_mzn);
  const gasto_papel_mzn = round2(f * precoFolha);
  const gasto_toner_mzn = round2(tonerIdx * precoToner);
  return {
    ...unidades,
    toner_estimado: Math.round(tonerIdx * 1000) / 1000,
    gasto_papel_mzn,
    gasto_toner_mzn,
    custo_total_mzn: round2(gasto_papel_mzn + gasto_toner_mzn),
  };
}

/** Enriquece linha agregada (dept/prov/user) com custos. */
export function enriquecerComCustos(linha, precos, campos = {}) {
  const folhas = num(linha.folhas ?? campos.folhas);
  const custos = calcularCustosImpressao({
    folhas,
    folhas_gray: num(linha.folhas_gray ?? campos.folhas_gray),
    folhas_cor: num(linha.folhas_cor ?? campos.folhas_cor),
    folhas_duplex: num(linha.folhas_duplex ?? campos.folhas_duplex),
    precos,
  });
  return { ...linha, folhas, ...custos };
}

/** Tendência % entre dois valores. */
export function tendenciaPercentual(atual, anterior) {
  const a = num(atual);
  const p = num(anterior);
  if (p === 0) return a > 0 ? 100 : 0;
  return round2(((a - p) / p) * 100);
}

/** Comparativo mensal de custos PaperCut (últimos N meses). */
export async function evolucaoCustosMensais({ meses = 6, provinciaId } = {}) {
  const precos = await obterPrecosReferencia({ provinciaId });
  const now = new Date();
  const resultado = [];

  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const ano = d.getUTCFullYear();
    const mes = d.getUTCMonth() + 1;
    const inicio = new Date(Date.UTC(ano, mes - 1, 1));
    const fim = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const where = { imprimido_em: { [Op.between]: [inicio, fim] } };
    if (provinciaId) where.provincia_id = provinciaId;

    const sum = await models.PapercutLinha.findOne({
      attributes: [
        [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
        [
          models.sequelize.fn(
            'SUM',
            models.sequelize.literal('CASE WHEN grayscale = 1 THEN paginas * copias ELSE 0 END')
          ),
          'folhas_gray',
        ],
        [
          models.sequelize.fn(
            'SUM',
            models.sequelize.literal('CASE WHEN grayscale = 0 THEN paginas * copias ELSE 0 END')
          ),
          'folhas_cor',
        ],
        [
          models.sequelize.fn(
            'SUM',
            models.sequelize.literal('CASE WHEN duplex = 1 THEN paginas * copias ELSE 0 END')
          ),
          'folhas_duplex',
        ],
      ],
      where,
      raw: true,
    });

    const folhas = num(sum?.folhas);
    const custos = calcularCustosImpressao({
      folhas,
      folhas_gray: sum?.folhas_gray,
      folhas_cor: sum?.folhas_cor,
      folhas_duplex: sum?.folhas_duplex,
      precos,
    });

    resultado.push({
      ano,
      mes,
      label: `${ano}-${String(mes).padStart(2, '0')}`,
      folhas,
      ...custos,
    });
  }

  const comTendencia = resultado.map((item, idx) => {
    const ant = idx > 0 ? resultado[idx - 1] : null;
    return {
      ...item,
      tendencia_custo_pct: ant ? tendenciaPercentual(item.custo_total_mzn, ant.custo_total_mzn) : null,
    };
  });

  const ultimos = comTendencia.filter((x) => x.folhas > 0);
  const media_custo_mensal_mzn =
    ultimos.length > 0
      ? round2(ultimos.reduce((s, x) => s + x.custo_total_mzn, 0) / ultimos.length)
      : 0;

  return { precos_referencia: precos, meses: comTendencia, media_custo_mensal_mzn };
}

/** Dashboard executivo integrado consumíveis + PaperCut. */
export async function obterDashboardExecutivo() {
  const now = new Date();
  const ano = now.getUTCFullYear();
  const mes = now.getUTCMonth() + 1;
  const pad = (x) => String(x).padStart(2, '0');
  const deStr = `${ano}-${pad(mes)}-01`;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const ateStr = `${ano}-${pad(mes)}-${pad(ultimo)}`;

  const precos = await obterPrecosReferencia({ de: deStr, ate: ateStr });
  const evolucao = await evolucaoCustosMensais({ meses: 6 });

  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
  const sumMes = await models.PapercutLinha.findOne({
    attributes: [
      [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
      [
        models.sequelize.fn(
          'SUM',
          models.sequelize.literal('CASE WHEN grayscale = 1 THEN paginas * copias ELSE 0 END')
        ),
        'folhas_gray',
      ],
      [
        models.sequelize.fn(
          'SUM',
          models.sequelize.literal('CASE WHEN grayscale = 0 THEN paginas * copias ELSE 0 END')
        ),
        'folhas_cor',
      ],
      [
        models.sequelize.fn(
          'SUM',
          models.sequelize.literal('CASE WHEN duplex = 1 THEN paginas * copias ELSE 0 END')
        ),
        'folhas_duplex',
      ],
    ],
    where: { imprimido_em: { [Op.between]: [inicioMes, fimMes] } },
    raw: true,
  });

  const custosMes = calcularCustosImpressao({
    folhas: sumMes?.folhas,
    folhas_gray: sumMes?.folhas_gray,
    folhas_cor: sumMes?.folhas_cor,
    folhas_duplex: sumMes?.folhas_duplex,
    precos,
  });

  const porDept = await models.sequelize.query(
    `SELECT d.nome AS departamento,
        SUM(l.paginas * l.copias) AS folhas,
        SUM(CASE WHEN l.grayscale = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_gray,
        SUM(CASE WHEN l.grayscale = 0 THEN l.paginas * l.copias ELSE 0 END) AS folhas_cor,
        SUM(CASE WHEN l.duplex = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_duplex
     FROM papercut_linhas l
     INNER JOIN departamentos_gestao d ON d.id = l.departamento_id
     WHERE l.imprimido_em BETWEEN :inicio AND :fim
     GROUP BY d.id, d.nome
     ORDER BY folhas DESC
     LIMIT 12`,
    {
      replacements: { inicio: inicioMes, fim: fimMes },
      type: models.sequelize.QueryTypes.SELECT,
    }
  );

  const porProv = await models.sequelize.query(
    `SELECT p.nome AS provincia,
        SUM(l.paginas * l.copias) AS folhas,
        SUM(CASE WHEN l.grayscale = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_gray,
        SUM(CASE WHEN l.grayscale = 0 THEN l.paginas * l.copias ELSE 0 END) AS folhas_cor,
        SUM(CASE WHEN l.duplex = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_duplex
     FROM papercut_linhas l
     INNER JOIN provincias p ON p.id = l.provincia_id
     WHERE l.imprimido_em BETWEEN :inicio AND :fim
     GROUP BY p.id, p.nome
     ORDER BY folhas DESC`,
    {
      replacements: { inicio: inicioMes, fim: fimMes },
      type: models.sequelize.QueryTypes.SELECT,
    }
  );

  const gastoRealConsumiveis = await models.ConsumivelRegisto.findOne({
    where: { data_aquisicao: { [Op.between]: [deStr, ateStr] } },
    attributes: [[fn('SUM', col('preco_total')), 'total']],
    raw: true,
  });

  const custosPorDept = porDept.map((r) => enriquecerComCustos(r, precos));
  const custosPorProv = porProv.map((r) => enriquecerComCustos(r, precos));

  const mesAtual = evolucao.meses[evolucao.meses.length - 1];
  const mesAnterior = evolucao.meses[evolucao.meses.length - 2];

  return {
    periodo_atual: { ano, mes, de: deStr, ate: ateStr },
    precos_referencia: precos,
    custos_impressao_mes: custosMes,
    gasto_aquisicoes_consumiveis_mes: round2(gastoRealConsumiveis?.total),
    media_custo_mensal_impressao_mzn: evolucao.media_custo_mensal_mzn,
    tendencia_custo_mensal_pct: mesAnterior
      ? tendenciaPercentual(mesAtual?.custo_total_mzn, mesAnterior?.custo_total_mzn)
      : null,
    evolucao_mensal_custos: evolucao.meses,
    custos_por_departamento: custosPorDept,
    custos_por_provincia: custosPorProv,
    comparativo_departamentos: [...custosPorDept].sort(
      (a, b) => b.custo_total_mzn - a.custo_total_mzn
    ),
    comparativo_provincias: [...custosPorProv].sort((a, b) => b.custo_total_mzn - a.custo_total_mzn),
  };
}
