import { Op, fn, col } from 'sequelize';
import models from '../../models/index.js';
import { consumiveisRepository } from './consumiveis.repository.js';
import {
  FOLHAS_POR_CAIXA_A4,
  FOLHAS_POR_RESMA_A4,
  RESMAS_POR_CAIXA_A4,
  estimativaTonerRelativa,
} from './consumiveis.constants.js';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function calcularPrecoTotal(quantidade, precoUnitario) {
  return Math.round(num(quantidade) * num(precoUnitario) * 10000) / 10000;
}

export function metricasPapelA4(registo) {
  const q = num(registo.quantidade);
  const folhasTotais = q * FOLHAS_POR_CAIXA_A4;
  const inicio = registo.data_aquisicao ? new Date(registo.data_aquisicao) : null;
  const fim = registo.data_termino ? new Date(registo.data_termino) : null;
  const agora = new Date();

  if (!inicio) {
    return {
      folhas_totais: folhasTotais,
      caixas: q,
      percentagem_consumida: null,
      estimativa_caixas_usadas: null,
      estimativa_duracao_stock_dias: null,
    };
  }

  if (!fim) {
    const dias = Math.max(1, (agora - inicio) / 86400000);
    return {
      folhas_totais: folhasTotais,
      caixas: q,
      percentagem_consumida: null,
      dias_desde_aquisicao: Math.round(dias * 10) / 10,
      estimativa_caixas_usadas: null,
      estimativa_duracao_stock_dias: null,
      nota: 'Defina data de término para estimar percentagem consumida e duração.',
    };
  }

  const totalMs = Math.max(1, fim - inicio);
  const decorrido = Math.min(Math.max(0, agora - inicio), totalMs);
  const percentagemConsumida = Math.min(100, Math.round((decorrido / totalMs) * 1000) / 10);
  const diasDuracao = totalMs / 86400000;
  const estimativaCaixasUsadas = Math.round((q * percentagemConsumida) / 10) / 10;

  const resmas = folhasTotais / FOLHAS_POR_RESMA_A4;
  return {
    folhas_totais: folhasTotais,
    resmas: Math.round(resmas * 100) / 100,
    caixas: q,
    regra: { folhas_por_resma: FOLHAS_POR_RESMA_A4, resmas_por_caixa: RESMAS_POR_CAIXA_A4, folhas_por_caixa: FOLHAS_POR_CAIXA_A4 },
    percentagem_consumida: percentagemConsumida,
    estimativa_caixas_usadas: estimativaCaixasUsadas,
    estimativa_duracao_stock_dias: Math.round(diasDuracao * 10) / 10,
  };
}

export async function listarRegistos(query) {
  const {
    page = 1,
    limit = 25,
    provinciaId,
    departamentoId,
    tipo,
    de,
    ate,
    search,
  } = query;
  const where = {};
  if (provinciaId) where.provincia_id = provinciaId;
  if (departamentoId) where.departamento_id = departamentoId;
  if (tipo) where.tipo = tipo;
  if (de && ate) where.data_aquisicao = { [Op.between]: [de, ate] };
  if (search && String(search).trim()) {
    where.observacoes = { [Op.like]: `%${String(search).trim()}%` };
  }
  const offset = (Number(page) - 1) * Number(limit);
  return consumiveisRepository.findRegistos({
    where,
    limit: Math.min(200, Number(limit) || 25),
    offset,
  });
}

export async function obterDashboardConsumiveis() {
  const totalRegistos = await models.ConsumivelRegisto.count();
  const soma = await models.ConsumivelRegisto.findOne({
    attributes: [[fn('SUM', col('preco_total')), 'total_gasto']],
    raw: true,
  });
  const totalGasto = num(soma?.total_gasto);

  const papelRows = await models.ConsumivelRegisto.findAll({
    where: { tipo: 'papel_a4' },
    attributes: [[fn('SUM', col('quantidade')), 'caixas']],
    raw: true,
  });
  const caixasPapel = num(papelRows[0]?.caixas);
  const folhasPapel = caixasPapel * FOLHAS_POR_CAIXA_A4;

  let porDept = [];
  try {
    porDept = await models.sequelize.query(
      `SELECT d.nome AS departamento, SUM(l.paginas * l.copias) AS folhas
       FROM papercut_linhas l
       INNER JOIN departamentos_gestao d ON d.id = l.departamento_id
       GROUP BY d.id, d.nome
       ORDER BY folhas DESC`,
      { type: models.sequelize.QueryTypes.SELECT }
    );
  } catch {
    porDept = [];
  }

  const porProv = await models.sequelize.query(
    `SELECT p.nome AS provincia, SUM(r.preco_total) AS total
     FROM consumiveis_registos r
     INNER JOIN provincias p ON p.id = r.provincia_id
     GROUP BY p.id, p.nome
     ORDER BY total DESC`,
    { type: models.sequelize.QueryTypes.SELECT }
  );

  const mensal = await models.sequelize.query(
    `SELECT DATE_FORMAT(data_aquisicao, '%Y-%m') AS mes, SUM(preco_total) AS total
     FROM consumiveis_registos
     GROUP BY mes
     ORDER BY mes DESC
     LIMIT 12`,
    { type: models.sequelize.QueryTypes.SELECT }
  );

  return {
    total_registos: totalRegistos,
    total_gasto_mzn: totalGasto,
    total_folhas_papel_estimadas: folhasPapel,
    total_caixas_a4: caixasPapel,
    maior_departamento_impressao: porDept[0]?.departamento || null,
    maior_provincia: porProv[0]?.provincia || null,
    impressoes_por_departamento_papercut: porDept,
    gastos_por_provincia: porProv,
    evolucao_mensal: mensal,
  };
}

const TIPOS_CONSUMIVEL = ['papel_a4', 'envelope', 'toner', 'agrafos'];

/** Relatório consolidado de consumíveis por província/distrito (balcão). */
export async function relatorioConsumoPorProvincia({ de, ate } = {}) {
  const replacements = {};
  let dateClause = '1=1';
  if (de && ate) {
    dateClause = 'r.data_aquisicao BETWEEN :de AND :ate';
    replacements.de = de;
    replacements.ate = ate;
  }

  const porProvRaw = await models.sequelize.query(
    `SELECT p.id AS provincia_id, p.nome AS provincia,
        COUNT(r.id) AS num_registos,
        SUM(r.preco_total) AS gasto_mzn,
        SUM(CASE WHEN r.tipo = 'papel_a4' THEN r.quantidade ELSE 0 END) AS qtd_papel_a4,
        SUM(CASE WHEN r.tipo = 'papel_a4' THEN r.preco_total ELSE 0 END) AS gasto_papel_a4,
        SUM(CASE WHEN r.tipo = 'envelope' THEN r.quantidade ELSE 0 END) AS qtd_envelope,
        SUM(CASE WHEN r.tipo = 'envelope' THEN r.preco_total ELSE 0 END) AS gasto_envelope,
        SUM(CASE WHEN r.tipo = 'toner' THEN r.quantidade ELSE 0 END) AS qtd_toner,
        SUM(CASE WHEN r.tipo = 'toner' THEN r.preco_total ELSE 0 END) AS gasto_toner,
        SUM(CASE WHEN r.tipo = 'agrafos' THEN r.quantidade ELSE 0 END) AS qtd_agrafos,
        SUM(CASE WHEN r.tipo = 'agrafos' THEN r.preco_total ELSE 0 END) AS gasto_agrafos
     FROM consumiveis_registos r
     INNER JOIN provincias p ON p.id = r.provincia_id
     WHERE ${dateClause}
     GROUP BY p.id, p.nome
     ORDER BY gasto_mzn DESC`,
    { replacements, type: models.sequelize.QueryTypes.SELECT }
  );

  const porTipoRaw = await models.sequelize.query(
    `SELECT r.tipo, COUNT(*) AS num_registos, SUM(r.quantidade) AS quantidade, SUM(r.preco_total) AS gasto_mzn
     FROM consumiveis_registos r
     WHERE ${dateClause}
     GROUP BY r.tipo`,
    { replacements, type: models.sequelize.QueryTypes.SELECT }
  );

  const [totAgg] = await models.sequelize.query(
    `SELECT COUNT(*) AS num_registos, SUM(r.preco_total) AS gasto_mzn
     FROM consumiveis_registos r
     WHERE ${dateClause}`,
    { replacements, type: models.sequelize.QueryTypes.SELECT }
  );

  const por_provincia = porProvRaw.map((row) => ({
    provincia_id: row.provincia_id,
    provincia: row.provincia,
    num_registos: num(row.num_registos),
    gasto_mzn: num(row.gasto_mzn),
    por_tipo: {
      papel_a4: { quantidade: num(row.qtd_papel_a4), gasto_mzn: num(row.gasto_papel_a4) },
      envelope: { quantidade: num(row.qtd_envelope), gasto_mzn: num(row.gasto_envelope) },
      toner: { quantidade: num(row.qtd_toner), gasto_mzn: num(row.gasto_toner) },
      agrafos: { quantidade: num(row.qtd_agrafos), gasto_mzn: num(row.gasto_agrafos) },
    },
  }));

  const resumo_por_tipo = TIPOS_CONSUMIVEL.map((tipo) => {
    const found = porTipoRaw.find((x) => x.tipo === tipo);
    return {
      tipo,
      num_registos: found ? num(found.num_registos) : 0,
      quantidade: found ? num(found.quantidade) : 0,
      gasto_mzn: found ? num(found.gasto_mzn) : 0,
    };
  });

  const totais = {
    num_registos: num(totAgg?.num_registos),
    gasto_mzn: num(totAgg?.gasto_mzn),
  };

  const filtros = {
    de: de || null,
    ate: ate || null,
    descricao:
      de && ate
        ? `Data de aquisição entre ${de} e ${ate}`
        : 'Todas as datas de aquisição (sem filtro)',
  };

  return {
    emitido_em: new Date().toISOString(),
    filtros,
    totais,
    por_provincia,
    resumo_por_tipo,
  };
}

export async function obterAlertasConsumiveis() {
  const alertas = [];
  const limiarCaixas = Math.max(0, parseFloat(process.env.ALERTA_STOCK_CAIXAS_A4 || '2'));

  const papelPorProv = await models.sequelize.query(
    `SELECT p.nome AS provincia, SUM(r.quantidade) AS caixas
     FROM consumiveis_registos r
     INNER JOIN provincias p ON p.id = r.provincia_id
     WHERE r.tipo = 'papel_a4' AND r.data_termino IS NULL
     GROUP BY p.id, p.nome
     HAVING SUM(r.quantidade) < :limiar`,
    { replacements: { limiar: limiarCaixas }, type: models.sequelize.QueryTypes.SELECT }
  );

  for (const row of papelPorProv) {
    const caixas = num(row.caixas);
    alertas.push({
      tipo: 'stock_baixo',
      severidade: 'media',
      mensagem: `Stock baixo de papel A4 (${caixas} caixas) — balcão ${row.provincia}`,
    });
  }

  const gastoProv = await models.sequelize.query(
    `SELECT p.nome AS provincia, SUM(r.preco_total) AS total
     FROM consumiveis_registos r
     INNER JOIN provincias p ON p.id = r.provincia_id
     GROUP BY p.id, p.nome`,
    { type: models.sequelize.QueryTypes.SELECT }
  );
  const totalsProv = gastoProv.map((g) => num(g.total)).filter((t) => t > 0);
  const mediaProv = totalsProv.length ? totalsProv.reduce((a, b) => a + b, 0) / totalsProv.length : 0;
  const limiteExcessoProv = mediaProv * (parseFloat(process.env.ALERTA_CONSUMO_EXCESSO_MULT || '2.5') || 2.5);
  for (const g of gastoProv) {
    if (num(g.total) > limiteExcessoProv && limiteExcessoProv > 0) {
      alertas.push({
        tipo: 'consumo_excessivo',
        severidade: 'alta',
        mensagem: `Gasto elevado em consumíveis no balcão ${g.provincia}: ${num(g.total).toFixed(2)} MZN`,
      });
    }
  }

  return alertas;
}

export async function estatisticasTonerPorImpressoes(papercutWhere) {
  const sum = await models.PapercutLinha.findOne({
    attributes: [
      [fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
      [
        fn(
          'SUM',
          models.sequelize.literal('CASE WHEN grayscale = 1 THEN paginas * copias ELSE 0 END')
        ),
        'gray',
      ],
      [
        fn(
          'SUM',
          models.sequelize.literal('CASE WHEN grayscale = 0 THEN paginas * copias ELSE 0 END')
        ),
        'color',
      ],
      [
        fn(
          'SUM',
          models.sequelize.literal('CASE WHEN duplex = 1 THEN paginas * copias ELSE 0 END')
        ),
        'duplex',
      ],
    ],
    where: papercutWhere,
    raw: true,
  });
  const folhas = num(sum?.folhas);
  const gray = num(sum?.gray);
  const color = num(sum?.color);
  const duplex = num(sum?.duplex);
  const toner = estimativaTonerRelativa({
    paginas: folhas,
    coloridas: color,
    grayscale: gray,
    duplex,
  });
  return { folhas, gray, color, duplex, toner_estimado: Math.round(toner * 1000) / 1000 };
}

function mapLinhaExport(j) {
  return {
    id: j.id,
    provincia: j.provincia?.nome,
    departamento: j.departamento?.nome || '',
    responsavel: j.registado_por?.nome || j.registado_por?.email || '',
    tipo: j.tipo,
    quantidade: num(j.quantidade),
    preco_unitario: num(j.preco_unitario),
    preco_total: num(j.preco_total),
    data_aquisicao: j.data_aquisicao,
    data_termino: j.data_termino,
    observacoes: j.observacoes || '',
    anexos: (j.anexos || []).map((a) => ({
      id: a.id,
      nome_original: a.nome_original,
      documento_tipo: a.documento_tipo,
      mime_type: a.mime_type,
      tamanho_bytes: num(a.tamanho_bytes),
      created_at: a.created_at,
    })),
  };
}

function payloadFromRows(rows, filtros) {
  let total = 0;
  const linhas = rows.map((r) => {
    const L = mapLinhaExport(r.toJSON());
    total += L.preco_total;
    return L;
  });
  return {
    emitido_em: new Date().toISOString(),
    tipo: 'mapa_completo',
    filtros,
    totais: { num_registos: linhas.length, total_mzn: Math.round(total * 10000) / 10000 },
    linhas,
  };
}

/** Mapa de todos os consumíveis cadastrados (filtro opcional por datas de aquisição). */
export async function exportPayloadMapaCompleto({ de, ate } = {}) {
  const where = {};
  if (de && ate) where.data_aquisicao = { [Op.between]: [de, ate] };
  const rows = await consumiveisRepository.findRegistosRelatorio(where);
  const descricao =
    de && ate
      ? `Aquisições entre ${de} e ${ate}`
      : 'Todos os consumíveis registados no sistema';
  return payloadFromRows(rows, { de: de || null, ate: ate || null, descricao });
}

/** Dados normalizados para exportação por intervalo de aquisição. */
export async function exportPayloadRegistosPeriodo({ de, ate }) {
  const rows = await consumiveisRepository.findRegistosPorPeriodoAquisicao({ de, ate });
  return payloadFromRows(rows, { de, ate });
}
