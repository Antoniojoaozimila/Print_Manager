import { Op } from 'sequelize';
import models from '../../models/index.js';
import { consumiveisRepository } from './consumiveis.repository.js';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const TIPOS = ['papel_a4', 'envelope', 'toner', 'agrafos'];

/** Constrói intervalo de datas e cláusula WHERE Sequelize. */
export function buildFiltrosRelatorioConsumiveis(query) {
  const {
    ano: anoRaw,
    mes: mesRaw,
    de: deRaw,
    ate: ateRaw,
    provinciaId,
    departamentoId,
    tipo,
  } = query;

  const ano = anoRaw != null && anoRaw !== '' ? Number(anoRaw) : null;
  const mes = mesRaw != null && mesRaw !== '' ? Number(mesRaw) : null;
  const de = deRaw?.trim() || null;
  const ate = ateRaw?.trim() || null;

  const where = {};
  if (provinciaId) where.provincia_id = provinciaId;
  if (departamentoId) where.departamento_id = departamentoId;
  if (tipo) where.tipo = tipo;

  let periodo = { tipo: 'intervalo', de: null, ate: null, ano: null, mes: null };

  if (ano && mes) {
    const pad = (x) => String(x).padStart(2, '0');
    periodo = {
      tipo: 'mensal',
      ano,
      mes,
      de: `${ano}-${pad(mes)}-01`,
      ate: `${ano}-${pad(mes)}-${pad(new Date(Date.UTC(ano, mes, 0)).getUTCDate())}`,
    };
  } else if (ano && !mes) {
    periodo = { tipo: 'anual', ano, mes: null, de: `${ano}-01-01`, ate: `${ano}-12-31` };
  } else if (de && ate) {
    periodo = { tipo: 'intervalo', de, ate, ano: null, mes: null };
  } else {
    const err = new Error('Informe ano+mês (mensal), ano (anual) ou intervalo de/até.');
    err.status = 400;
    throw err;
  }

  if (periodo.de > periodo.ate) {
    const err = new Error('A data inicial não pode ser posterior à data final.');
    err.status = 400;
    throw err;
  }

  where.data_aquisicao = { [Op.between]: [periodo.de, periodo.ate] };

  return {
    where,
    periodo,
    filtros: {
      provincia_id: provinciaId || null,
      departamento_id: departamentoId || null,
      tipo: tipo || null,
      de: periodo.de,
      ate: periodo.ate,
      ano: periodo.ano,
      mes: periodo.mes,
    },
  };
}

function mapLinha(j) {
  return {
    id: j.id,
    provincia: j.provincia?.nome || null,
    provincia_id: j.provincia_id,
    departamento: j.departamento?.nome || null,
    departamento_id: j.departamento_id,
    tipo: j.tipo,
    quantidade: num(j.quantidade),
    preco_unitario: num(j.preco_unitario),
    preco_total: num(j.preco_total),
    data_aquisicao: j.data_aquisicao,
    data_termino: j.data_termino,
    observacoes: j.observacoes || '',
    responsavel: j.registado_por?.nome || j.registado_por?.email || null,
    responsavel_id: j.registado_por_id || null,
    anexos: (j.anexos || []).map((a) => ({
      id: a.id,
      nome_original: a.nome_original,
      documento_tipo: a.documento_tipo,
    })),
  };
}

async function carregarLinhas(where) {
  const rows = await consumiveisRepository.findRegistosRelatorio(where);
  return rows.map((r) => mapLinha(r.toJSON()));
}

async function agregarPorDimensao(where, dimensao) {
  const replacements = {};
  let extra = '';
  if (where.provincia_id) {
    extra += ' AND r.provincia_id = :provinciaId';
    replacements.provinciaId = where.provincia_id;
  }
  if (where.departamento_id) {
    extra += ' AND r.departamento_id = :departamentoId';
    replacements.departamentoId = where.departamento_id;
  }
  if (where.tipo) {
    extra += ' AND r.tipo = :tipo';
    replacements.tipo = where.tipo;
  }
  const [de, ate] = where.data_aquisicao[Op.between];
  replacements.de = de;
  replacements.ate = ate;

  let sql;
  if (dimensao === 'tipo') {
    sql = `SELECT r.tipo AS dimensao, COUNT(*) AS num_registos,
      SUM(r.quantidade) AS quantidade, SUM(r.preco_total) AS total_mzn
     FROM consumiveis_registos r
     WHERE r.data_aquisicao BETWEEN :de AND :ate ${extra}
     GROUP BY r.tipo ORDER BY total_mzn DESC`;
  } else if (dimensao === 'departamento') {
    sql = `SELECT d.nome AS dimensao, COUNT(*) AS num_registos,
      SUM(r.quantidade) AS quantidade, SUM(r.preco_total) AS total_mzn
     FROM consumiveis_registos r
     INNER JOIN departamentos_gestao d ON d.id = r.departamento_id
     WHERE r.data_aquisicao BETWEEN :de AND :ate ${extra}
     GROUP BY d.id, d.nome ORDER BY total_mzn DESC`;
  } else {
    sql = `SELECT p.nome AS dimensao, COUNT(*) AS num_registos,
      SUM(r.quantidade) AS quantidade, SUM(r.preco_total) AS total_mzn
     FROM consumiveis_registos r
     INNER JOIN provincias p ON p.id = r.provincia_id
     WHERE r.data_aquisicao BETWEEN :de AND :ate ${extra}
     GROUP BY p.id, p.nome ORDER BY total_mzn DESC`;
  }

  return models.sequelize.query(sql, {
    replacements,
    type: models.sequelize.QueryTypes.SELECT,
  });
}

async function comparacaoMensal(where, ano) {
  const replacements = { ano: `${ano}-%` };
  let extra = '';
  if (where.provincia_id) {
    extra += ' AND r.provincia_id = :provinciaId';
    replacements.provinciaId = where.provincia_id;
  }
  if (where.departamento_id) {
    extra += ' AND r.departamento_id = :departamentoId';
    replacements.departamentoId = where.departamento_id;
  }
  if (where.tipo) {
    extra += ' AND r.tipo = :tipo';
    replacements.tipo = where.tipo;
  }

  const rows = await models.sequelize.query(
    `SELECT DATE_FORMAT(r.data_aquisicao, '%Y-%m') AS mes,
        COUNT(*) AS num_registos, SUM(r.preco_total) AS total_mzn
     FROM consumiveis_registos r
     WHERE r.data_aquisicao LIKE :ano ${extra}
     GROUP BY mes ORDER BY mes ASC`,
    { replacements, type: models.sequelize.QueryTypes.SELECT }
  );

  const map = Object.fromEntries(rows.map((r) => [r.mes, r]));
  const pad = (m) => String(m).padStart(2, '0');
  const out = [];
  for (let m = 1; m <= 12; m += 1) {
    const key = `${ano}-${pad(m)}`;
    const row = map[key];
    out.push({
      mes: m,
      mes_label: key,
      num_registos: row ? num(row.num_registos) : 0,
      total_mzn: row ? num(row.total_mzn) : 0,
    });
  }
  return out;
}

function calcularTendencias(comparacao) {
  const comDados = comparacao.filter((c) => c.total_mzn > 0);
  if (!comDados.length) {
    return { mes_maior_gasto: null, mes_menor_gasto: null, crescimento_ultimo_mes_pct: null };
  }
  const maior = comDados.reduce((a, b) => (b.total_mzn > a.total_mzn ? b : a));
  const menor = comDados.reduce((a, b) => (b.total_mzn < a.total_mzn ? b : a));
  let crescimento = null;
  if (comDados.length >= 2) {
    const ult = comDados[comDados.length - 1].total_mzn;
    const ant = comDados[comDados.length - 2].total_mzn;
    if (ant > 0) crescimento = Math.round(((ult - ant) / ant) * 1000) / 10;
  }
  return {
    mes_maior_gasto: maior.mes_label,
    mes_menor_gasto: menor.mes_label,
    crescimento_ultimo_mes_pct: crescimento,
  };
}

/** Relatório mensal de consumíveis adquiridos. */
export async function relatorioMensalConsumiveis(query) {
  const { where, periodo, filtros } = buildFiltrosRelatorioConsumiveis(query);
  if (periodo.tipo !== 'mensal' && periodo.tipo !== 'intervalo') {
    const err = new Error('Relatório mensal requer ano e mês, ou intervalo de/até.');
    err.status = 400;
    throw err;
  }

  const linhas = await carregarLinhas(where);
  const total_mzn = linhas.reduce((s, L) => s + L.preco_total, 0);

  return {
    emitido_em: new Date().toISOString(),
    tipo: 'mensal',
    periodo,
    filtros,
    totais: {
      num_registos: linhas.length,
      total_gasto_mzn: Math.round(total_mzn * 10000) / 10000,
    },
    linhas,
  };
}

/** Relatório anual consolidado com estatísticas e tendências. */
export async function relatorioAnualConsumiveis(query) {
  const q = { ...query };
  if (q.ano && !q.mes) delete q.mes;
  const { where, periodo, filtros } = buildFiltrosRelatorioConsumiveis({
    ...q,
    mes: q.mes || undefined,
  });

  if (periodo.tipo !== 'anual') {
    const err = new Error('Relatório anual requer o parâmetro ano (sem mês).');
    err.status = 400;
    throw err;
  }

  const linhas = await carregarLinhas(where);
  const total_mzn = linhas.reduce((s, L) => s + L.preco_total, 0);

  const [porTipo, porDept, porProv] = await Promise.all([
    agregarPorDimensao(where, 'tipo'),
    agregarPorDimensao(where, 'departamento'),
    agregarPorDimensao(where, 'provincia'),
  ]);

  const comparacao_mensal = await comparacaoMensal(where, periodo.ano);
  const mesesComGasto = comparacao_mensal.filter((c) => c.total_mzn > 0).length || 1;

  const resumo_por_tipo = TIPOS.map((tipo) => {
    const found = porTipo.find((x) => x.dimensao === tipo);
    return {
      tipo,
      num_registos: found ? num(found.num_registos) : 0,
      quantidade: found ? num(found.quantidade) : 0,
      total_mzn: found ? num(found.total_mzn) : 0,
    };
  });

  return {
    emitido_em: new Date().toISOString(),
    tipo: 'anual',
    periodo,
    filtros,
    totais: {
      num_registos: linhas.length,
      total_gasto_mzn: Math.round(total_mzn * 10000) / 10000,
      media_mensal_gasto_mzn: Math.round((total_mzn / mesesComGasto) * 100) / 100,
      media_mensal_registos: Math.round((linhas.length / mesesComGasto) * 10) / 10,
    },
    resumo_por_tipo,
    total_por_departamento: porDept.map((r) => ({
      departamento: r.dimensao,
      num_registos: num(r.num_registos),
      quantidade: num(r.quantidade),
      total_mzn: num(r.total_mzn),
    })),
    total_por_provincia: porProv.map((r) => ({
      provincia: r.dimensao,
      num_registos: num(r.num_registos),
      quantidade: num(r.quantidade),
      total_mzn: num(r.total_mzn),
    })),
    comparacao_mensal,
    tendencias: calcularTendencias(comparacao_mensal),
    linhas,
  };
}
