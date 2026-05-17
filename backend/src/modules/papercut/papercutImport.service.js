import { createHash } from 'crypto';
import { Op } from 'sequelize';
import { parse } from 'csv-parse/sync';
import models from '../../models/index.js';
import { papercutRepository } from './papercut.repository.js';
import { folhasParaUnidadesA4 } from '../consumiveis/consumiveis.constants.js';
import { obterUtilizadoresDetalheParaRelatorio } from './papercutUsuarioRelatorio.service.js';
import {
  obterPrecosReferencia,
  calcularCustosImpressao,
  enriquecerComCustos,
  evolucaoCustosMensais,
  tendenciaPercentual,
} from '../custos/custosIntegracao.service.js';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function mapHeaderToCanonical(headers) {
  const map = {};
  /** Export "Print Logger" do PaperCut: linha de título + cabeçalhos com nomes compostos (ex.: Document Name, Paper Size). */
  const aliases = {
    time: ['time'],
    user: ['user'],
    pages: ['pages'],
    copies: ['copies'],
    printer: ['printer'],
    document: ['document', 'documentname'],
    client: ['client'],
    paper: ['paper', 'papersize'],
    language: ['language'],
    height: ['height'],
    width: ['width'],
    duplex: ['duplex'],
    grayscale: ['grayscale'],
    size: ['size'],
  };
  for (let i = 0; i < headers.length; i += 1) {
    const n = normalizeHeader(headers[i]);
    for (const [canon, keys] of Object.entries(aliases)) {
      if (keys.some((k) => n === k)) {
        map[i] = canon;
        break;
      }
    }
  }
  return map;
}

export function validarCabecalhoCsv(headers) {
  const idxMap = mapHeaderToCanonical(headers);
  const found = new Set(Object.values(idxMap));
  const required = ['time', 'user', 'pages', 'copies', 'printer', 'document'];
  const missing = required.filter((c) => !found.has(c));
  return { ok: missing.length === 0, missing, idxMap, headers };
}

/** CSVs do Print Logger incluem 1+ linhas informativas antes da linha Time,User,Pages,… */
function indiceLinhaCabecalho(records, maxScan = 30) {
  for (let i = 0; i < Math.min(maxScan, records.length); i += 1) {
    const row = records[i];
    if (!Array.isArray(row) || !row.length) continue;
    if (validarCabecalhoCsv(row).ok) return i;
  }
  return -1;
}

function linhaParaObjeto(record, idxMap) {
  const o = {};
  for (let i = 0; i < record.length; i += 1) {
    const key = idxMap[i];
    if (key) o[key] = record[i];
  }
  return o;
}

function parseBool(v) {
  const s = String(v || '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
}

/** Valores típicos do export PaperCut: "DUPLEX" / "NOT DUPLEX", "GRAYSCALE" / "NOT GRAYSCALE". */
function parsePapercutDuplex(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('not') && s.includes('duplex')) return false;
  if (s.includes('duplex')) return true;
  return parseBool(v);
}

function parsePapercutGrayscale(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('not') && s.includes('gray')) return false;
  if (s.includes('gray')) return true;
  return parseBool(v);
}

function parseIntSafe(v) {
  const n = parseInt(String(v || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v) {
  const d = new Date(String(v || '').trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dedupHash(provinciaId, departamentoId, o) {
  const raw = [
    provinciaId,
    departamentoId,
    String(o.time || ''),
    String(o.user || ''),
    String(o.pages || ''),
    String(o.copies || ''),
    String(o.printer || ''),
    String(o.document || ''),
    String(o.size || ''),
  ].join('|');
  return createHash('sha256').update(raw).digest('hex');
}

export function parseCsvBuffer(buffer, provinciaId, departamentoId) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const records = parse(text, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  if (!records.length) {
    const err = new Error('CSV vazio');
    err.status = 400;
    throw err;
  }
  const headerIdx = indiceLinhaCabecalho(records);
  if (headerIdx < 0) {
    const err = new Error(
      'Não foi encontrada uma linha de cabeçalho válida (Time, User, Pages, Copies, Printer, Document). ' +
        'Confirme que é um CSV do PaperCut Print Logger ou que não falta a linha de cabeçalho.'
    );
    err.status = 400;
    throw err;
  }
  const headers = records[headerIdx];
  const { ok, missing, idxMap } = validarCabecalhoCsv(headers);
  if (!ok) {
    const err = new Error(`Colunas em falta no CSV: ${missing.join(', ')}`);
    err.status = 400;
    err.details = { missing };
    throw err;
  }

  const linhas = [];
  const erros = [];
  for (let r = headerIdx + 1; r < records.length; r += 1) {
    const row = records[r];
    const o = linhaParaObjeto(row, idxMap);
    try {
      const imprimido_em = parseDate(o.time);
      const paginas = Math.max(0, parseIntSafe(o.pages));
      const copias = Math.max(1, parseIntSafe(o.copies) || 1);
      const duplex = parsePapercutDuplex(o.duplex);
      const grayscale = parsePapercutGrayscale(o.grayscale);
      const hash = dedupHash(provinciaId, departamentoId, o);
      linhas.push({
        import_job_id: null,
        provincia_id: provinciaId,
        departamento_id: departamentoId,
        dedup_hash: hash,
        imprimido_em,
        usuario_papercut: o.user ? String(o.user).slice(0, 255) : null,
        paginas,
        copias,
        impressora: o.printer ? String(o.printer).slice(0, 255) : null,
        documento: o.document ? String(o.document).slice(0, 512) : null,
        cliente: o.client ? String(o.client).slice(0, 255) : null,
        papel: o.paper ? String(o.paper).slice(0, 120) : null,
        idioma: o.language ? String(o.language).slice(0, 64) : null,
        altura_mm: parseIntSafe(o.height) || null,
        largura_mm: parseIntSafe(o.width) || null,
        duplex,
        grayscale,
        tamanho_bytes: parseIntSafe(o.size) || null,
      });
    } catch (e) {
      erros.push({ linha: r + 1, erro: e.message });
    }
  }
  return { linhas, erros, total: linhas.length };
}

export async function processarImportacaoFicheiros({
  usuarioId,
  provinciaId,
  departamentoId,
  nomeLote,
  buffers,
}) {
  const job = await papercutRepository.createJob({
    usuario_id: usuarioId,
    provincia_id: provinciaId,
    departamento_id: departamentoId,
    nome_lote: nomeLote || null,
    status: 'processing',
    total_linhas: 0,
    linhas_inseridas: 0,
    linhas_duplicadas: 0,
    linhas_erro: 0,
  });

  let allLinhas = [];
  let errosAcumulados = 0;
  const logs = [];
  try {
    for (let i = 0; i < buffers.length; i += 1) {
      const { linhas, erros } = parseCsvBuffer(buffers[i], provinciaId, departamentoId);
      allLinhas = allLinhas.concat(
        linhas.map((L) => ({ ...L, import_job_id: job.id }))
      );
      errosAcumulados += erros.length;
      logs.push(`Ficheiro ${i + 1}: ${linhas.length} linhas válidas, ${erros.length} erros de linha`);
    }

    await papercutRepository.updateJob(job.id, {
      total_linhas: allLinhas.length,
      linhas_erro: errosAcumulados,
    });

    const { inserted, dup } = await papercutRepository.bulkInsertLinhas(allLinhas);

    await papercutRepository.updateJob(job.id, {
      status: 'completed',
      linhas_inseridas: inserted,
      linhas_duplicadas: dup,
      log_processamento: logs.join('\n'),
    });

    const fresh = await papercutRepository.findJob(job.id);
    return fresh;
  } catch (e) {
    await papercutRepository.updateJob(job.id, {
      status: 'failed',
      mensagem_erro: e.message,
      log_processamento: logs.join('\n'),
    });
    throw e;
  }
}

export async function relatorioMensalPapercut({ ano, mes, provinciaId, departamentoId }) {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
  const where = { imprimido_em: { [Op.between]: [inicio, fim] } };
  if (provinciaId) where.provincia_id = provinciaId;
  if (departamentoId) where.departamento_id = departamentoId;

  const sum = await models.PapercutLinha.findOne({
    attributes: [
      [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
      [models.sequelize.fn('SUM', models.sequelize.col('paginas')), 'paginas'],
      [models.sequelize.fn('SUM', models.sequelize.col('copias')), 'copias'],
      [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'jobs'],
      [
        models.sequelize.fn(
          'SUM',
          models.sequelize.literal('CASE WHEN duplex = 1 THEN paginas * copias ELSE 0 END')
        ),
        'folhas_duplex',
      ],
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
        'folhas_nao_gray',
      ],
    ],
    where,
    raw: true,
  });

  const folhas = parseFloat(sum?.folhas) || 0;
  const folhas_gray = parseFloat(sum?.folhas_gray) || 0;
  const folhas_cor = parseFloat(sum?.folhas_nao_gray) || 0;
  const folhas_duplex = parseFloat(sum?.folhas_duplex) || 0;

  const pad = (x) => String(x).padStart(2, '0');
  const deStr = `${ano}-${pad(mes)}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const ateStr = `${ano}-${pad(mes)}-${pad(ultimoDia)}`;

  const precosRef = await obterPrecosReferencia({
    provinciaId,
    de: deStr,
    ate: ateStr,
  });

  const custosTotais = calcularCustosImpressao({
    folhas,
    folhas_gray,
    folhas_cor,
    folhas_duplex,
    precos: precosRef,
  });
  const unidadesPapel = folhasParaUnidadesA4(folhas);

  const topUsers = await papercutRepository.topUsuarios(where, 15);
  const topPrinters = await papercutRepository.topImpressoras(where, 15);

  const deptReplacements = { inicio, fim };
  let deptSqlWhere = 'l.imprimido_em BETWEEN :inicio AND :fim';
  if (provinciaId) {
    deptSqlWhere += ' AND l.provincia_id = :provinciaId';
    deptReplacements.provinciaId = provinciaId;
  }
  if (departamentoId) {
    deptSqlWhere += ' AND l.departamento_id = :departamentoId';
    deptReplacements.departamentoId = departamentoId;
  }
  const porDepartamentoRaw = await models.sequelize.query(
    `SELECT d.nome AS departamento,
        SUM(l.paginas * l.copias) AS folhas,
        SUM(CASE WHEN l.grayscale = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_gray,
        SUM(CASE WHEN l.grayscale = 0 THEN l.paginas * l.copias ELSE 0 END) AS folhas_cor,
        SUM(CASE WHEN l.duplex = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_duplex
     FROM papercut_linhas l
     INNER JOIN departamentos_gestao d ON d.id = l.departamento_id
     WHERE ${deptSqlWhere}
     GROUP BY d.id, d.nome
     ORDER BY folhas DESC`,
    { replacements: deptReplacements, type: models.sequelize.QueryTypes.SELECT }
  );

  const porProvinciaRaw = await models.sequelize.query(
    `SELECT p.nome AS provincia,
        SUM(l.paginas * l.copias) AS folhas,
        SUM(CASE WHEN l.grayscale = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_gray,
        SUM(CASE WHEN l.grayscale = 0 THEN l.paginas * l.copias ELSE 0 END) AS folhas_cor,
        SUM(CASE WHEN l.duplex = 1 THEN l.paginas * l.copias ELSE 0 END) AS folhas_duplex
     FROM papercut_linhas l
     INNER JOIN provincias p ON p.id = l.provincia_id
     WHERE ${deptSqlWhere}
     GROUP BY p.id, p.nome
     ORDER BY folhas DESC`,
    { replacements: deptReplacements, type: models.sequelize.QueryTypes.SELECT }
  );

  const porDepartamento = porDepartamentoRaw.map((r) => enriquecerComCustos(r, precosRef));
  const porProvincia = porProvinciaRaw.map((r) => enriquecerComCustos(r, precosRef));
  const topUsersComCusto = topUsers.map((u) =>
    enriquecerComCustos({ usuario_papercut: u.usuario_papercut, folhas: u.folhas }, precosRef)
  );

  let consumiveis_aquisicao_no_mes = [];
  let resumo_consumiveis_mes = { num_registos: 0, total_mzn: 0 };
  try {
    const whereC = { data_aquisicao: { [Op.between]: [deStr, ateStr] } };
    if (provinciaId) whereC.provincia_id = provinciaId;
    const rowsC = await models.ConsumivelRegisto.findAll({
      where: whereC,
      include: [
        { model: models.Provincia, as: 'provincia', attributes: ['id', 'nome'] },
        {
          model: models.ConsumivelAnexo,
          as: 'anexos',
          required: false,
          attributes: ['id', 'nome_original', 'documento_tipo', 'mime_type', 'tamanho_bytes', 'created_at'],
        },
      ],
      order: [['data_aquisicao', 'ASC']],
    });
    let sumC = 0;
    consumiveis_aquisicao_no_mes = rowsC.map((r) => {
      const j = r.toJSON();
      sumC += num(j.preco_total);
      return {
        id: j.id,
        provincia: j.provincia?.nome,
        tipo: j.tipo,
        quantidade: num(j.quantidade),
        preco_unitario: num(j.preco_unitario),
        preco_total: num(j.preco_total),
        data_aquisicao: j.data_aquisicao,
        data_termino: j.data_termino,
        observacoes: j.observacoes,
        anexos: (j.anexos || []).map((a) => ({
          id: a.id,
          nome_original: a.nome_original,
          documento_tipo: a.documento_tipo,
          mime_type: a.mime_type,
          tamanho_bytes: num(a.tamanho_bytes),
        })),
      };
    });
    resumo_consumiveis_mes = {
      num_registos: consumiveis_aquisicao_no_mes.length,
      total_mzn: Math.round(sumC * 10000) / 10000,
    };
  } catch {
    consumiveis_aquisicao_no_mes = [];
    resumo_consumiveis_mes = { num_registos: 0, total_mzn: 0 };
  }

  const periodo = { ano, mes };
  const detalheUtilizadores = await obterUtilizadoresDetalheParaRelatorio(where, periodo, precosRef);
  const utilizadores = detalheUtilizadores.utilizadores;
  const resumo_utilizadores_mes = detalheUtilizadores.resumo_utilizadores;

  const evolucao = await evolucaoCustosMensais({ meses: 6, provinciaId });
  const mesAtual = evolucao.meses.find((m) => m.ano === ano && m.mes === mes);
  const idxAtual = evolucao.meses.findIndex((m) => m.ano === ano && m.mes === mes);
  const mesAnterior = idxAtual > 0 ? evolucao.meses[idxAtual - 1] : null;

  return {
    periodo,
    precos_referencia: precosRef,
    totais: {
      folhas,
      resmas: unidadesPapel.resmas,
      caixas: unidadesPapel.caixas,
      paginas: parseFloat(sum?.paginas) || 0,
      copias: parseFloat(sum?.copias) || 0,
      jobs: parseInt(sum?.jobs, 10) || 0,
      folhas_duplex,
      folhas_gray,
      folhas_cor_ou_nao_gray: folhas_cor,
    },
    financeiro: {
      gasto_papel_mzn: custosTotais.gasto_papel_mzn,
      gasto_toner_mzn: custosTotais.gasto_toner_mzn,
      custo_total_mzn: custosTotais.custo_total_mzn,
      gasto_aquisicoes_consumiveis_mes: resumo_consumiveis_mes.total_mzn,
      media_custo_mensal_mzn: evolucao.media_custo_mensal_mzn,
      tendencia_custo_mensal_pct: mesAnterior
        ? tendenciaPercentual(mesAtual?.custo_total_mzn, mesAnterior.custo_total_mzn)
        : null,
      preco_por_folha_mzn: precosRef.preco_por_folha_mzn,
      preco_por_caixa_mzn: precosRef.preco_por_caixa_mzn,
      fonte_precos: precosRef.fonte,
    },
    estimativas: {
      resmas_a4: unidadesPapel.resmas,
      caixas_a4: unidadesPapel.caixas,
      toner_relativo: custosTotais.toner_estimado,
      gasto_papel_mzn: custosTotais.gasto_papel_mzn,
      gasto_toner_estimado_mzn: custosTotais.gasto_toner_mzn,
      custo_total_estimado_mzn: custosTotais.custo_total_mzn,
    },
    evolucao_custos_mensais: evolucao.meses,
    comparativo_departamentos: [...porDepartamento].sort((a, b) => b.custo_total_mzn - a.custo_total_mzn),
    comparativo_provincias: [...porProvincia].sort((a, b) => b.custo_total_mzn - a.custo_total_mzn),
    top_usuarios: topUsersComCusto,
    top_impressoras: topPrinters,
    por_departamento: porDepartamento,
    por_provincia: porProvincia,
    consumiveis_aquisicao_no_mes,
    resumo_consumiveis_mes,
    utilizadores,
    resumo_utilizadores_mes,
  };
}

export async function analisesPapercut({ provinciaId, departamentoId, de, ate }) {
  const where = {};
  if (provinciaId) where.provincia_id = provinciaId;
  if (departamentoId) where.departamento_id = departamentoId;
  if (de && ate) where.imprimido_em = { [Op.between]: [new Date(de), new Date(ate)] };

  const topUsers = await papercutRepository.topUsuarios(where, 20);
  const topPrinters = await papercutRepository.topImpressoras(where, 20);

  const insights = [];
  const colorHeavy = topUsers.filter((u) => num(u.folhas) > 5000);
  if (colorHeavy.length) {
    insights.push({
      tipo: 'volume_elevado',
      texto: 'Utilizadores com volume muito elevado de impressão — rever políticas.',
      amostra: colorHeavy.slice(0, 5),
    });
  }

  return { top_usuarios: topUsers, top_impressoras: topPrinters, insights };
}

export { papercutRepository };
