import models from '../models/index.js';
import { registrarLog } from '../services/logService.js';
import { escanearSubRedeImpressoras, PORTAS_PADRAO } from '../services/networkPrinterDiscovery.js';

async function list(req, res, next) {
  try {
    const rows = await models.Impressora.findAll({ order: [['nome', 'ASC']] });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const row = await models.Impressora.create(req.body);
    await registrarLog({
      usuarioId: req.user.id,
      acao: 'IMPRESSORA_CRIADA',
      detalhes: { id: row.id, nome: row.nome },
      ip: req.ip,
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const row = await models.Impressora.findByPk(req.params.id);
    if (!row) {
      const err = new Error('Impressora não encontrada');
      err.status = 404;
      throw err;
    }
    await row.update(req.body);
    await registrarLog({
      usuarioId: req.user.id,
      acao: 'IMPRESSORA_ATUALIZADA',
      detalhes: { id: row.id },
      ip: req.ip,
    });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
}

async function discoverNetwork(req, res, next) {
  try {
    if (process.env.DISABLE_NETWORK_DISCOVERY === '1') {
      const err = new Error('Descoberta de rede desativada neste servidor');
      err.status = 403;
      throw err;
    }
    const { prefix, hostInicio, hostFim } = req.body;
    const hosts = await escanearSubRedeImpressoras({ prefix, hostInicio, hostFim });
    res.json({
      success: true,
      data: {
        hosts,
        portas_testadas: PORTAS_PADRAO,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function heartbeat(req, res, next) {
  try {
    const row = await models.Impressora.findByPk(req.params.id);
    if (!row) {
      const err = new Error('Impressora não encontrada');
      err.status = 404;
      throw err;
    }
    row.ultimo_heartbeat = new Date();
    await row.save();
    res.json({ success: true, data: { id: row.id, ultimo_heartbeat: row.ultimo_heartbeat } });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const row = await models.Impressora.findByPk(req.params.id);
    if (!row) {
      const err = new Error('Impressora não encontrada');
      err.status = 404;
      throw err;
    }
    const snapshot = { id: row.id, nome: row.nome };
    await row.destroy();
    await registrarLog({
      usuarioId: req.user.id,
      acao: 'IMPRESSORA_REMOVIDA',
      detalhes: snapshot,
      ip: req.ip,
    });
    res.json({ success: true, data: { removida: snapshot } });
  } catch (e) {
    next(e);
  }
}

export { list, create, update, discoverNetwork, heartbeat, remove };
