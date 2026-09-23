import { Op } from 'sequelize';
import models from '../../models/index.js';
import {
  TECNICOS,
  TIPOS_SOLICITACAO,
  ESTADOS_TICKET,
  MEIOS_SOLICITACAO,
  FASES_PROJECTO,
  PROVINCIAS_TI,
  agoraMaputo,
  normalizarHora,
  calcularDuracaoMin,
} from './tickets.constants.js';

function jsonAssistencia(row) {
  const j = row?.toJSON ? row.toJSON() : { ...row };
  j.hora_inicio = normalizarHora(j.hora_inicio);
  j.hora_fim = normalizarHora(j.hora_fim);
  j.urgencia = Boolean(j.urgencia);
  return j;
}

function jsonProjecto(row) {
  return row?.toJSON ? row.toJSON() : row;
}

function emptyToNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toBoolUrgencia(v) {
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string' && v.trim().toLowerCase() === 'sim') return true;
  return false;
}

async function proximoNumero(model, transaction) {
  const n = await model.max('numero', { transaction });
  return (Number(n) || 0) + 1;
}

function aplicarConclusaoAssistencia(payload, { forcarFim = false } = {}) {
  const agora = agoraMaputo();
  if (payload.estado === 'Concluído') {
    if (forcarFim || !payload.hora_fim) payload.hora_fim = agora.hora;
  }
  payload.duracao_min = calcularDuracaoMin(payload.hora_inicio, payload.hora_fim);
  return payload;
}

function aplicarConclusaoProjecto(payload) {
  if (payload.estado === 'Concluído') {
    if (payload.percentagem_conclusao == null || payload.percentagem_conclusao < 100) {
      payload.percentagem_conclusao = 100;
    }
    if (!payload.fase_actual) payload.fase_actual = 'Concluído';
  }
  const pct = Number(payload.percentagem_conclusao);
  payload.percentagem_conclusao = Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 0;
  return payload;
}

function filtroData(query) {
  const agora = agoraMaputo();
  const data = emptyToNull(query.data) || agora.data;
  const de = emptyToNull(query.de) || data;
  const ate = emptyToNull(query.ate) || data;
  return { data, de, ate };
}

export async function obterCatalogos() {
  const departamentos = await models.DepartamentoGestao.findAll({
    where: { ativo: true },
    order: [
      ['ordem', 'ASC'],
      ['nome', 'ASC'],
    ],
    attributes: ['id', 'nome'],
  });
  return {
    tecnicos: TECNICOS,
    tipos_solicitacao: TIPOS_SOLICITACAO,
    estados: ESTADOS_TICKET,
    meios: MEIOS_SOLICITACAO,
    fases: FASES_PROJECTO,
    provincias: PROVINCIAS_TI,
    departamentos: departamentos.map((d) => d.nome),
    urgencia: ['Não', 'Sim'],
  };
}

export async function listarAssistencias(query = {}) {
  const { de, ate } = filtroData(query);
  const where = { data: { [Op.between]: [de, ate] } };
  if (emptyToNull(query.tecnico)) where.tecnico = query.tecnico;
  if (emptyToNull(query.estado)) where.estado = query.estado;
  const search = emptyToNull(query.search);
  if (search) {
    where[Op.or] = [
      { colaborador_assistido: { [Op.like]: `%${search}%` } },
      { problema: { [Op.like]: `%${search}%` } },
      { departamento: { [Op.like]: `%${search}%` } },
      { tipo_solicitacao: { [Op.like]: `%${search}%` } },
    ];
  }
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
  const { count, rows } = await models.TicketAssistencia.findAndCountAll({
    where,
    order: [
      ['data', 'DESC'],
      ['hora_inicio', 'ASC'],
      ['numero', 'ASC'],
    ],
    offset: (page - 1) * limit,
    limit,
  });
  return { count, rows: rows.map(jsonAssistencia), de, ate, page, limit };
}

export async function criarAssistencia(body, user) {
  const agora = agoraMaputo();
  return models.sequelize.transaction(async (transaction) => {
    const payload = aplicarConclusaoAssistencia({
      numero: await proximoNumero(models.TicketAssistencia, transaction),
      data: emptyToNull(body.data) || agora.data,
      tecnico: emptyToNull(body.tecnico) || user?.nome || TECNICOS[0],
      usuario_id: user?.id || null,
      hora_inicio: normalizarHora(body.hora_inicio) || agora.hora,
      hora_fim: normalizarHora(body.hora_fim),
      departamento: emptyToNull(body.departamento),
      provincia: emptyToNull(body.provincia),
      colaborador_assistido: emptyToNull(body.colaborador_assistido),
      tipo_solicitacao: emptyToNull(body.tipo_solicitacao),
      problema: emptyToNull(body.problema),
      resolucao: emptyToNull(body.resolucao),
      estado: emptyToNull(body.estado) || 'Em Progresso',
      urgencia: toBoolUrgencia(body.urgencia),
      descricao_urgencia: emptyToNull(body.descricao_urgencia),
      num_chamadas: Number(body.num_chamadas) > 0 ? Number(body.num_chamadas) : 1,
      meio_solicitacao: emptyToNull(body.meio_solicitacao),
      observacoes: emptyToNull(body.observacoes),
    });
    const created = await models.TicketAssistencia.create(payload, { transaction });
    return jsonAssistencia(created);
  });
}

export async function actualizarAssistencia(id, body, { concluir = false } = {}) {
  const row = await models.TicketAssistencia.findByPk(id);
  if (!row) {
    const err = new Error('Assistência não encontrada');
    err.status = 404;
    throw err;
  }
  const patch = {};
  const campos = [
    'data',
    'tecnico',
    'departamento',
    'provincia',
    'colaborador_assistido',
    'tipo_solicitacao',
    'problema',
    'resolucao',
    'estado',
    'descricao_urgencia',
    'meio_solicitacao',
    'observacoes',
  ];
  for (const c of campos) {
    if (body[c] !== undefined) patch[c] = c === 'estado' ? body[c] : emptyToNull(body[c]);
  }
  if (body.hora_inicio !== undefined) patch.hora_inicio = normalizarHora(body.hora_inicio) || row.hora_inicio;
  if (body.hora_fim !== undefined) patch.hora_fim = normalizarHora(body.hora_fim);
  if (body.urgencia !== undefined) patch.urgencia = toBoolUrgencia(body.urgencia);
  if (body.num_chamadas !== undefined) {
    patch.num_chamadas = Number(body.num_chamadas) > 0 ? Number(body.num_chamadas) : row.num_chamadas;
  }
  if (concluir) patch.estado = 'Concluído';

  const merged = aplicarConclusaoAssistencia(
    {
      hora_inicio: patch.hora_inicio ?? row.hora_inicio,
      hora_fim: patch.hora_fim !== undefined ? patch.hora_fim : row.hora_fim,
      estado: patch.estado ?? row.estado,
    },
    { forcarFim: concluir }
  );
  patch.hora_fim = merged.hora_fim;
  patch.duracao_min = merged.duracao_min;
  await row.update(patch);
  return jsonAssistencia(row);
}

export async function listarProjectos(query = {}) {
  const { de, ate } = filtroData(query);
  const where = { data: { [Op.between]: [de, ate] } };
  if (emptyToNull(query.responsavel)) where.responsavel = query.responsavel;
  if (emptyToNull(query.estado)) where.estado = query.estado;
  const search = emptyToNull(query.search);
  if (search) {
    where[Op.or] = [
      { projecto_sistema: { [Op.like]: `%${search}%` } },
      { tarefa: { [Op.like]: `%${search}%` } },
    ];
  }
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
  const { count, rows } = await models.TicketProjecto.findAndCountAll({
    where,
    order: [
      ['data', 'DESC'],
      ['numero', 'ASC'],
    ],
    offset: (page - 1) * limit,
    limit,
  });
  return { count, rows: rows.map(jsonProjecto), de, ate, page, limit };
}

export async function criarProjecto(body, user) {
  const agora = agoraMaputo();
  return models.sequelize.transaction(async (transaction) => {
    const payload = aplicarConclusaoProjecto({
      numero: await proximoNumero(models.TicketProjecto, transaction),
      data: emptyToNull(body.data) || agora.data,
      responsavel: emptyToNull(body.responsavel) || user?.nome || TECNICOS[0],
      usuario_id: user?.id || null,
      projecto_sistema: emptyToNull(body.projecto_sistema),
      tarefa: emptyToNull(body.tarefa),
      data_atribuicao: emptyToNull(body.data_atribuicao) || agora.data,
      prazo: emptyToNull(body.prazo),
      fase_actual: emptyToNull(body.fase_actual) || 'Análise',
      percentagem_conclusao: body.percentagem_conclusao,
      alteracoes_solicitadas: emptyToNull(body.alteracoes_solicitadas),
      data_alteracao: emptyToNull(body.data_alteracao),
      descricao_alteracao: emptyToNull(body.descricao_alteracao),
      accao_realizada: emptyToNull(body.accao_realizada),
      estado: emptyToNull(body.estado) || 'Pendente',
      observacoes: emptyToNull(body.observacoes),
    });
    const created = await models.TicketProjecto.create(payload, { transaction });
    return jsonProjecto(created);
  });
}

export async function apagarAssistencia(id) {
  const row = await models.TicketAssistencia.findByPk(id);
  if (!row) {
    const err = new Error('Assistência não encontrada');
    err.status = 404;
    throw err;
  }
  const snapshot = jsonAssistencia(row);
  await row.destroy();
  return snapshot;
}

export async function actualizarProjecto(id, body) {
  const row = await models.TicketProjecto.findByPk(id);
  if (!row) {
    const err = new Error('Projecto/tarefa não encontrado');
    err.status = 404;
    throw err;
  }
  const patch = {};
  const campos = [
    'data',
    'responsavel',
    'projecto_sistema',
    'tarefa',
    'data_atribuicao',
    'prazo',
    'fase_actual',
    'alteracoes_solicitadas',
    'data_alteracao',
    'descricao_alteracao',
    'accao_realizada',
    'estado',
    'observacoes',
  ];
  for (const c of campos) {
    if (body[c] !== undefined) patch[c] = emptyToNull(body[c]);
  }
  if (body.percentagem_conclusao !== undefined) patch.percentagem_conclusao = body.percentagem_conclusao;
  const merged = aplicarConclusaoProjecto({
    estado: patch.estado ?? row.estado,
    percentagem_conclusao: patch.percentagem_conclusao ?? row.percentagem_conclusao,
    fase_actual: patch.fase_actual ?? row.fase_actual,
  });
  patch.percentagem_conclusao = merged.percentagem_conclusao;
  if (merged.fase_actual) patch.fase_actual = merged.fase_actual;
  await row.update(patch);
  return jsonProjecto(row);
}

export async function apagarProjecto(id) {
  const row = await models.TicketProjecto.findByPk(id);
  if (!row) {
    const err = new Error('Projecto/tarefa não encontrado');
    err.status = 404;
    throw err;
  }
  const snapshot = jsonProjecto(row);
  await row.destroy();
  return snapshot;
}

function resumoTecnicos(assistencias, projectos) {
  const nomes = new Set([
    ...TECNICOS,
    ...assistencias.map((a) => a.tecnico).filter(Boolean),
    ...projectos.map((p) => p.responsavel).filter(Boolean),
  ]);
  return [...nomes].map((nome) => {
    const as = assistencias.filter((a) => a.tecnico === nome);
    const pj = projectos.filter((p) => p.responsavel === nome);
    const tempo = as.reduce((s, a) => s + (Number(a.duracao_min) || 0), 0);
    return {
      tecnico: nome,
      total_assistencias: as.length,
      concluidas: as.filter((a) => a.estado === 'Concluído').length,
      pendentes: as.filter((a) => a.estado === 'Pendente' || a.estado === 'Em Progresso').length,
      urgencias: as.filter((a) => a.urgencia).length,
      tempo_total_min: tempo,
      tempo_medio_min: as.length ? Math.round((tempo / as.length) * 10) / 10 : 0,
      projectos_tarefas: pj.length,
    };
  });
}

export async function obterDashboard(query = {}) {
  const { data, de, ate } = filtroData(query);
  const where = { data: { [Op.between]: [de, ate] } };
  const [assistencias, projectos] = await Promise.all([
    models.TicketAssistencia.findAll({ where, order: [['hora_inicio', 'ASC']] }),
    models.TicketProjecto.findAll({ where, order: [['numero', 'ASC']] }),
  ]);
  const porTecnico = resumoTecnicos(assistencias, projectos);
  const tempoTotal = assistencias.reduce((s, a) => s + (Number(a.duracao_min) || 0), 0);
  return {
    periodo: { data, de, ate },
    por_tecnico: porTecnico,
    indicadores: {
      total_assistencias: assistencias.length,
      total_urgencias: assistencias.filter((a) => a.urgencia).length,
      tempo_total_min: tempoTotal,
      tempo_medio_min: assistencias.length ? Math.round((tempoTotal / assistencias.length) * 10) / 10 : 0,
      projectos_registados: projectos.length,
      tarefas_concluidas: projectos.filter((p) => p.estado === 'Concluído').length,
    },
    assistencias: assistencias.map(jsonAssistencia),
    projectos: projectos.map(jsonProjecto),
  };
}
