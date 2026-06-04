import { Op, fn, col } from 'sequelize';
import models from '../../models/index.js';
import { folhasParaUnidadesA4 } from '../consumiveis/consumiveis.constants.js';

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

/** Gasto real em consumíveis (aquisições registadas) no período. */
export async function obterGastoRealConsumiveis({ provinciaId, de, ate } = {}) {
  const where = {};
  if (provinciaId) where.provincia_id = provinciaId;
  if (de && ate) where.data_aquisicao = { [Op.between]: [de, ate] };

  const [agg, porTipoRows] = await Promise.all([
    models.ConsumivelRegisto.findOne({
      where,
      attributes: [[fn('SUM', col('preco_total')), 'total']],
      raw: true,
    }),
    models.ConsumivelRegisto.findAll({
      where,
      attributes: ['tipo', [fn('SUM', col('preco_total')), 'total_mzn']],
      group: ['tipo'],
      raw: true,
    }),
  ]);

  const por_tipo = {};
  for (const row of porTipoRows) {
    por_tipo[row.tipo] = round2(row.total_mzn);
  }

  return {
    total_mzn: round2(agg?.total),
    por_tipo,
    gasto_papel_aquisicoes_mzn: round2(por_tipo.papel_a4) || null,
    gasto_toner_aquisicoes_mzn: round2(por_tipo.toner) || null,
    gasto_envelope_aquisicoes_mzn: round2(por_tipo.envelope) || null,
    gasto_agrafos_aquisicoes_mzn: round2(por_tipo.agrafos) || null,
  };
}

/** Preços reais apenas de registos em consumiveis_registos (sem fallback). */
export async function obterPrecosReaisConsumiveis({ provinciaId, de, ate } = {}) {
  const whereBase = {};
  if (provinciaId) whereBase.provincia_id = provinciaId;
  if (de && ate) whereBase.data_aquisicao = { [Op.between]: [de, ate] };

  const wherePapel = { ...whereBase, tipo: 'papel_a4' };
  const whereToner = { ...whereBase, tipo: 'toner' };

  const [papelAgg, tonerAgg, ultimoPapel, ultimoToner] = await Promise.all([
    models.ConsumivelRegisto.findOne({
      where: wherePapel,
      attributes: [[fn('AVG', col('preco_unitario')), 'media_preco_caixa']],
      raw: true,
    }),
    models.ConsumivelRegisto.findOne({
      where: whereToner,
      attributes: [[fn('AVG', col('preco_unitario')), 'media_preco_unidade']],
      raw: true,
    }),
    models.ConsumivelRegisto.findOne({
      where: { tipo: 'papel_a4', ...(provinciaId ? { provincia_id: provinciaId } : {}) },
      order: [['data_aquisicao', 'DESC']],
      attributes: ['preco_unitario'],
      raw: true,
    }),
    models.ConsumivelRegisto.findOne({
      where: { tipo: 'toner', ...(provinciaId ? { provincia_id: provinciaId } : {}) },
      order: [['data_aquisicao', 'DESC']],
      attributes: ['preco_unitario'],
      raw: true,
    }),
  ]);

  const precoCaixaPeriodo = num(papelAgg?.media_preco_caixa);
  const precoCaixaUltimo = num(ultimoPapel?.preco_unitario);
  const precoCaixa = precoCaixaPeriodo > 0 ? precoCaixaPeriodo : precoCaixaUltimo > 0 ? precoCaixaUltimo : null;

  const precoTonerPeriodo = num(tonerAgg?.media_preco_unidade);
  const precoTonerUltimo = num(ultimoToner?.preco_unitario);
  const precoTonerUn =
    precoTonerPeriodo > 0 ? precoTonerPeriodo : precoTonerUltimo > 0 ? precoTonerUltimo : null;

  const temDados = precoCaixa != null || precoTonerUn != null;

  return {
    fonte: temDados ? 'consumiveis' : null,
    preco_por_caixa_mzn: precoCaixa != null ? round4(precoCaixa) : null,
    preco_por_unidade_toner_mzn: precoTonerUn != null ? round4(precoTonerUn) : null,
  };
}

/** Volumes A4 derivados das folhas PaperCut (sem custos). */
export function enriquecerVolumesImpressao(linha) {
  const folhas = num(linha.folhas);
  return { ...linha, folhas, ...folhasParaUnidadesA4(folhas) };
}

/** Província: volumes + aquisições reais do mês. */
export function enriquecerProvinciaComAquisicoes(linha, gastoReal) {
  const base = enriquecerVolumesImpressao(linha);
  const total = gastoReal?.total_mzn > 0 ? round2(gastoReal.total_mzn) : null;
  return {
    ...base,
    aquisicoes_mes_mzn: total,
    custo_mes_real_mzn: total,
    gasto_papel_aquisicoes_mzn: gastoReal?.gasto_papel_aquisicoes_mzn ?? null,
    gasto_toner_aquisicoes_mzn: gastoReal?.gasto_toner_aquisicoes_mzn ?? null,
  };
}

export async function enriquecerProvinciasComAquisicoes(linhas, { de, ate } = {}) {
  const cacheGasto = new Map();
  const out = [];
  for (const linha of linhas) {
    const pid = linha.provincia_id;
    if (!pid) {
      out.push(enriquecerVolumesImpressao(linha));
      continue;
    }
    if (!cacheGasto.has(pid)) {
      cacheGasto.set(pid, await obterGastoRealConsumiveis({ provinciaId: pid, de, ate }));
    }
    out.push(enriquecerProvinciaComAquisicoes(linha, cacheGasto.get(pid)));
  }
  return out;
}

/** Dashboard executivo: volumes PaperCut + aquisições reais. */
export async function obterDashboardExecutivo() {
  const now = new Date();
  const ano = now.getUTCFullYear();
  const mes = now.getUTCMonth() + 1;
  const pad = (x) => String(x).padStart(2, '0');
  const deStr = `${ano}-${pad(mes)}-01`;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const ateStr = `${ano}-${pad(mes)}-${pad(ultimo)}`;

  const [precos, gastoMes] = await Promise.all([
    obterPrecosReaisConsumiveis({ de: deStr, ate: ateStr }),
    obterGastoRealConsumiveis({ de: deStr, ate: ateStr }),
  ]);

  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
  const sumMes = await models.PapercutLinha.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas']],
    where: { imprimido_em: { [Op.between]: [inicioMes, fimMes] } },
    raw: true,
  });

  const folhasMes = num(sumMes?.folhas);
  const volumesMes = folhasParaUnidadesA4(folhasMes);

  const porDept = await models.sequelize.query(
    `SELECT d.nome AS departamento, SUM(l.paginas * l.copias) AS folhas
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
    `SELECT p.id AS provincia_id, p.nome AS provincia, SUM(l.paginas * l.copias) AS folhas
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

  const custosPorDept = porDept.map((r) => enriquecerVolumesImpressao(r));
  const custosPorProv = await enriquecerProvinciasComAquisicoes(porProv, { de: deStr, ate: ateStr });

  return {
    periodo_atual: { ano, mes, de: deStr, ate: ateStr },
    precos_referencia: precos,
    volumes_impressao_mes: { folhas: folhasMes, ...volumesMes },
    gasto_aquisicoes_consumiveis_mes: gastoMes.total_mzn > 0 ? gastoMes.total_mzn : null,
    gasto_por_tipo_mes: gastoMes.por_tipo,
    custos_por_departamento: custosPorDept,
    custos_por_provincia: custosPorProv,
    comparativo_departamentos: [...custosPorDept].sort((a, b) => b.folhas - a.folhas),
    comparativo_provincias: [...custosPorProv].sort(
      (a, b) => (b.aquisicoes_mes_mzn ?? 0) - (a.aquisicoes_mes_mzn ?? 0)
    ),
  };
}

/** @deprecated Use obterPrecosReaisConsumiveis */
export const obterPrecosReferencia = obterPrecosReaisConsumiveis;
