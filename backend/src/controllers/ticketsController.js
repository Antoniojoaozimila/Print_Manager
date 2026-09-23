import {
  obterCatalogos,
  obterDashboard,
  listarAssistencias,
  criarAssistencia,
  actualizarAssistencia,
  apagarAssistencia,
  listarProjectos,
  criarProjecto,
  actualizarProjecto,
  apagarProjecto,
} from '../modules/tickets/tickets.service.js';
import { exportarRelatorioDiaExcel } from '../modules/tickets/ticketsExport.service.js';
import { registrarLog } from '../services/logService.js';

function jsonRow(row) {
  return row;
}

export async function catalogos(req, res, next) {
  try {
    res.json({ success: true, data: await obterCatalogos() });
  } catch (e) {
    next(e);
  }
}

export async function dashboard(req, res, next) {
  try {
    res.json({ success: true, data: await obterDashboard(req.query) });
  } catch (e) {
    next(e);
  }
}

export async function listAssistencias(req, res, next) {
  try {
    const { count, rows, de, ate, page, limit } = await listarAssistencias(req.query);
    res.json({
      success: true,
      data: rows.map(jsonRow),
      meta: { total: count, page, limit, de, ate },
    });
  } catch (e) {
    next(e);
  }
}

export async function createAssistencia(req, res, next) {
  try {
    const row = await criarAssistencia(req.body, req.user);
    await registrarLog({
      usuarioId: req.user?.id,
      acao: 'TICKET_ASSISTENCIA_CRIAR',
      detalhes: { id: row.id, numero: row.numero },
      ip: req.ip,
    });
    res.status(201).json({ success: true, data: jsonRow(row) });
  } catch (e) {
    next(e);
  }
}

export async function updateAssistencia(req, res, next) {
  try {
    const row = await actualizarAssistencia(req.params.id, req.body);
    res.json({ success: true, data: jsonRow(row) });
  } catch (e) {
    next(e);
  }
}

export async function concluirAssistencia(req, res, next) {
  try {
    const row = await actualizarAssistencia(req.params.id, req.body || {}, { concluir: true });
    await registrarLog({
      usuarioId: req.user?.id,
      acao: 'TICKET_ASSISTENCIA_CONCLUIR',
      detalhes: { id: row.id, numero: row.numero, duracao_min: row.duracao_min },
      ip: req.ip,
    });
    res.json({ success: true, data: jsonRow(row) });
  } catch (e) {
    next(e);
  }
}

export async function removeAssistencia(req, res, next) {
  try {
    const row = await apagarAssistencia(req.params.id);
    await registrarLog({
      usuarioId: req.user?.id,
      acao: 'TICKET_ASSISTENCIA_APAGAR',
      detalhes: { id: row.id, numero: row.numero },
      ip: req.ip,
    });
    res.json({ success: true, data: { removida: { id: row.id, numero: row.numero } } });
  } catch (e) {
    next(e);
  }
}

export async function listProjectos(req, res, next) {
  try {
    const { count, rows, de, ate, page, limit } = await listarProjectos(req.query);
    res.json({
      success: true,
      data: rows.map(jsonRow),
      meta: { total: count, page, limit, de, ate },
    });
  } catch (e) {
    next(e);
  }
}

export async function createProjecto(req, res, next) {
  try {
    const row = await criarProjecto(req.body, req.user);
    await registrarLog({
      usuarioId: req.user?.id,
      acao: 'TICKET_PROJECTO_CRIAR',
      detalhes: { id: row.id, numero: row.numero },
      ip: req.ip,
    });
    res.status(201).json({ success: true, data: jsonRow(row) });
  } catch (e) {
    next(e);
  }
}

export async function updateProjecto(req, res, next) {
  try {
    const row = await actualizarProjecto(req.params.id, req.body);
    res.json({ success: true, data: jsonRow(row) });
  } catch (e) {
    next(e);
  }
}

export async function removeProjecto(req, res, next) {
  try {
    const row = await apagarProjecto(req.params.id);
    await registrarLog({
      usuarioId: req.user?.id,
      acao: 'TICKET_PROJECTO_APAGAR',
      detalhes: { id: row.id, numero: row.numero },
      ip: req.ip,
    });
    res.json({ success: true, data: { removido: { id: row.id, numero: row.numero } } });
  } catch (e) {
    next(e);
  }
}

export async function exportRelatorioDia(req, res, next) {
  try {
    const dash = await obterDashboard(req.query);
    const { buffer, filename } = await exportarRelatorioDiaExcel(dash);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}
