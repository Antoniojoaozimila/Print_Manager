import { Op } from 'sequelize';
import models from '../../models/index.js';
import { folhasParaUnidadesA4 } from '../consumiveis/consumiveis.constants.js';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function buildFiltrosPapercutUsuario(query) {
  const {
    ano: anoRaw,
    mes: mesRaw,
    de: deRaw,
    ate: ateRaw,
    provinciaId,
    departamentoId,
    usuario,
  } = query;

  const ano = anoRaw != null && anoRaw !== '' ? Number(anoRaw) : null;
  const mes = mesRaw != null && mesRaw !== '' ? Number(mesRaw) : null;
  const de = deRaw?.trim() || null;
  const ate = ateRaw?.trim() || null;

  const where = {};
  if (provinciaId) where.provincia_id = provinciaId;
  if (departamentoId) where.departamento_id = departamentoId;
  if (usuario && String(usuario).trim()) {
    where.usuario_papercut = { [Op.like]: `%${String(usuario).trim()}%` };
  }

  let periodo = { tipo: 'intervalo', de: null, ate: null, ano: null, mes: null };

  if (ano && mes) {
    const inicio = new Date(Date.UTC(ano, mes - 1, 1));
    const fim = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    where.imprimido_em = { [Op.between]: [inicio, fim] };
    periodo = { tipo: 'mensal', ano, mes, de: inicio.toISOString(), ate: fim.toISOString() };
  } else if (de && ate) {
    const inicio = new Date(`${de}T00:00:00.000Z`);
    const fim = new Date(`${ate}T23:59:59.999Z`);
    where.imprimido_em = { [Op.between]: [inicio, fim] };
    periodo = { tipo: 'intervalo', de, ate, ano: null, mes: null };
  } else if (ano) {
    const inicio = new Date(Date.UTC(ano, 0, 1));
    const fim = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999));
    where.imprimido_em = { [Op.between]: [inicio, fim] };
    periodo = { tipo: 'anual', ano, mes: null, de: inicio.toISOString(), ate: fim.toISOString() };
  } else {
    const err = new Error('Informe ano+mês, ano ou intervalo de/até.');
    err.status = 400;
    throw err;
  }

  return {
    where,
    periodo,
    filtros: {
      provincia_id: provinciaId || null,
      departamento_id: departamentoId || null,
      usuario: usuario || null,
    },
  };
}

function diasNoPeriodo(periodo) {
  if (periodo.tipo === 'mensal' && periodo.ano && periodo.mes) {
    return new Date(Date.UTC(periodo.ano, periodo.mes, 0)).getUTCDate();
  }
  if (periodo.de && periodo.ate) {
    const a = new Date(periodo.de);
    const b = new Date(periodo.ate);
    return Math.max(1, Math.ceil((b - a) / 86400000) + 1);
  }
  if (periodo.tipo === 'anual') return 365;
  return 30;
}

function mesesNoPeriodo(periodo) {
  if (periodo.tipo === 'mensal') return 1;
  if (periodo.tipo === 'anual') return 12;
  return Math.max(1, Math.round(diasNoPeriodo(periodo) / 30));
}

function mapLinhaDetalhe(j) {
  return {
    id: j.id,
    usuario: j.usuario_papercut,
    departamento: j.departamento?.nome || null,
    provincia: j.provincia?.nome || null,
    data_hora: j.imprimido_em,
    impressora: j.impressora,
    documento: j.documento,
    paginas: num(j.paginas),
    copias: num(j.copias),
    folhas: num(j.paginas) * num(j.copias),
    papel: j.papel,
    duplex: Boolean(j.duplex),
    grayscale: Boolean(j.grayscale),
    cliente: j.cliente,
    idioma: j.idioma,
    largura_mm: j.largura_mm,
    altura_mm: j.altura_mm,
    tamanho_bytes: j.tamanho_bytes,
  };
}

function calcularEstatisticasUsuario(row, periodo) {
  const folhas = num(row.folhas);
  const jobs = num(row.jobs);
  const paginas = num(row.paginas);
  const copias = num(row.copias);
  const folhas_gray = num(row.folhas_gray);
  const folhas_cor = num(row.folhas_cor);
  const folhas_duplex = num(row.folhas_duplex);
  const unidades = folhasParaUnidadesA4(folhas);

  const dias = diasNoPeriodo(periodo);
  const meses = mesesNoPeriodo(periodo);

  return {
    total_impressoes: jobs,
    total_paginas: paginas,
    total_copias: copias,
    total_folhas: folhas,
    impressoes_coloridas_folhas: folhas_cor,
    impressoes_grayscale_folhas: folhas_gray,
    impressoes_duplex_folhas: folhas_duplex,
    resmas: unidades.resmas,
    caixas: unidades.caixas,
    media_mensal_impressoes: Math.round((jobs / meses) * 10) / 10,
    media_diaria_folhas: Math.round((folhas / dias) * 10) / 10,
  };
}

function whereComUtilizador(where) {
  const extra = [
    { usuario_papercut: { [Op.ne]: null } },
    { usuario_papercut: { [Op.ne]: '' } },
  ];
  if (where[Op.and]) {
    return { ...where, [Op.and]: [...where[Op.and], ...extra] };
  }
  return { ...where, [Op.and]: extra };
}

/** Dados de utilizadores + impressões (para inclusão no relatório mensal unificado). */
export async function obterUtilizadoresDetalheParaRelatorio(where, periodo) {
  const whereU = whereComUtilizador(where);

  const agg = await models.PapercutLinha.findAll({
    attributes: [
      'usuario_papercut',
      [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'jobs'],
      [models.sequelize.fn('SUM', models.sequelize.col('paginas')), 'paginas'],
      [models.sequelize.fn('SUM', models.sequelize.col('copias')), 'copias'],
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
    where: whereU,
    group: ['usuario_papercut'],
    order: [[models.sequelize.literal('folhas'), 'DESC']],
    raw: true,
  });

  const linhasRaw = await models.PapercutLinha.findAll({
    where: whereU,
    include: [
      { model: models.Provincia, as: 'provincia', attributes: ['nome'] },
      { model: models.DepartamentoGestao, as: 'departamento', attributes: ['nome'] },
    ],
    order: [
      ['usuario_papercut', 'ASC'],
      ['imprimido_em', 'ASC'],
    ],
    limit: 100000,
  });

  const porUsuario = new Map();
  for (const row of agg) {
    porUsuario.set(row.usuario_papercut, {
      usuario: row.usuario_papercut,
      departamento: null,
      provincia: null,
      estatisticas: calcularEstatisticasUsuario(row, periodo),
      impressoes: [],
    });
  }

  for (const linha of linhasRaw) {
    const j = linha.toJSON();
    const u = j.usuario_papercut;
    if (!porUsuario.has(u)) continue;
    const block = porUsuario.get(u);
    if (!block.departamento && j.departamento?.nome) block.departamento = j.departamento.nome;
    if (!block.provincia && j.provincia?.nome) block.provincia = j.provincia.nome;
    block.impressoes.push(mapLinhaDetalhe(j));
  }

  const utilizadores = [...porUsuario.values()].sort(
    (a, b) => b.estatisticas.total_folhas - a.estatisticas.total_folhas
  );

  const totaisGlobais = utilizadores.reduce(
    (acc, u) => {
      acc.jobs += u.estatisticas.total_impressoes;
      acc.folhas += u.estatisticas.total_folhas;
      return acc;
    },
    { jobs: 0, folhas: 0 }
  );

  return {
    utilizadores,
    resumo_utilizadores: {
      num_utilizadores: utilizadores.length,
      total_impressoes: totaisGlobais.jobs,
      total_folhas: totaisGlobais.folhas,
    },
  };
}

/** @deprecated Use relatório mensal unificado. Mantido para compatibilidade interna. */
export async function relatorioDetalhadoPorUtilizador(query) {
  const { where, periodo, filtros } = buildFiltrosPapercutUsuario(query);
  const block = await obterUtilizadoresDetalheParaRelatorio(where, periodo);
  return {
    emitido_em: new Date().toISOString(),
    periodo,
    filtros,
    totais_globais: {
      utilizadores: block.resumo_utilizadores.num_utilizadores,
      total_impressoes: block.resumo_utilizadores.total_impressoes,
      total_folhas: block.resumo_utilizadores.total_folhas,
    },
    utilizadores: block.utilizadores,
  };
}
