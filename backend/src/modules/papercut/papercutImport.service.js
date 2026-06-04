import { Op } from 'sequelize';
import models from '../../models/index.js';
import { papercutRepository } from './papercut.repository.js';
import { folhasParaUnidadesA4 } from '../consumiveis/consumiveis.constants.js';
import { obterUtilizadoresDetalheParaRelatorio } from './papercutUsuarioRelatorio.service.js';
import {
  obterPrecosReaisConsumiveis,
  obterGastoRealConsumiveis,
  enriquecerVolumesImpressao,
  enriquecerProvinciaComAquisicoes,
  enriquecerProvinciasComAquisicoes,
} from '../custos/custosIntegracao.service.js';
import { parsePapercutFicheiro } from './papercutFileParser.js';
import {
  csvTextoParaRecords,
  recordsParaLinhas,
  validarCabecalhoCsv,
  dedupHash,
} from './papercutParseCommon.js';

export { validarCabecalhoCsv, dedupHash } from './papercutParseCommon.js';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Compatibilidade: importação apenas CSV (buffer). */
export function parseCsvBuffer(buffer, provinciaId, departamentoId) {
  const records = csvTextoParaRecords(buffer.toString('utf8'));
  if (!records.length) {
    const err = new Error('CSV vazio');
    err.status = 400;
    throw err;
  }
  return recordsParaLinhas(records, provinciaId, departamentoId, { origem: 'CSV' });
}

export async function processarImportacaoFicheiros({
  usuarioId,
  provinciaId,
  departamentoId,
  nomeLote,
  ficheiros,
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
    for (let i = 0; i < ficheiros.length; i += 1) {
      const f = ficheiros[i];
      const { linhas, erros, formato, nome } = await parsePapercutFicheiro(
        f,
        provinciaId,
        departamentoId
      );
      allLinhas = allLinhas.concat(
        linhas.map((L) => ({ ...L, import_job_id: job.id }))
      );
      errosAcumulados += erros.length;
      logs.push(
        `${nome || `Ficheiro ${i + 1}`} (${formato}): ${linhas.length} linhas válidas, ${erros.length} erros de linha`
      );
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

  const [precosRef, gastoMes] = await Promise.all([
    obterPrecosReaisConsumiveis({ provinciaId, de: deStr, ate: ateStr }),
    obterGastoRealConsumiveis({ provinciaId, de: deStr, ate: ateStr }),
  ]);
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
    `SELECT p.id AS provincia_id, p.nome AS provincia,
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

  const porDepartamento = porDepartamentoRaw.map((r) => enriquecerVolumesImpressao(r));
  let porProvincia;
  if (provinciaId) {
    porProvincia = porProvinciaRaw.map((r) => enriquecerProvinciaComAquisicoes(r, gastoMes));
  } else {
    porProvincia = await enriquecerProvinciasComAquisicoes(porProvinciaRaw, { de: deStr, ate: ateStr });
  }
  const topUsersComCusto = topUsers.map((u) => ({
    usuario_papercut: u.usuario_papercut,
    folhas: num(u.folhas),
  }));

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
  const detalheUtilizadores = await obterUtilizadoresDetalheParaRelatorio(where, periodo);
  const utilizadores = detalheUtilizadores.utilizadores;
  const resumo_utilizadores_mes = detalheUtilizadores.resumo_utilizadores;

  const totalReal =
    resumo_consumiveis_mes.total_mzn > 0 ? resumo_consumiveis_mes.total_mzn : null;

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
      custo_mes_real_mzn: totalReal,
      gasto_aquisicoes_consumiveis_mes: totalReal,
      gasto_papel_aquisicoes_mzn: gastoMes.gasto_papel_aquisicoes_mzn,
      gasto_toner_aquisicoes_mzn: gastoMes.gasto_toner_aquisicoes_mzn,
      preco_por_caixa_mzn: precosRef.preco_por_caixa_mzn,
      preco_por_unidade_toner_mzn: precosRef.preco_por_unidade_toner_mzn,
    },
    comparativo_departamentos: [...porDepartamento].sort((a, b) => b.folhas - a.folhas),
    comparativo_provincias: [...porProvincia].sort(
      (a, b) => (b.aquisicoes_mes_mzn ?? 0) - (a.aquisicoes_mes_mzn ?? 0)
    ),
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
