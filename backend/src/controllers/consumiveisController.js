import { Op } from 'sequelize';
import multer from 'multer';
import path from 'path';
import models from '../models/index.js';
import { consumiveisRepository } from '../modules/consumiveis/consumiveis.repository.js';
import {
  listarRegistos,
  obterDashboardConsumiveis,
  obterAlertasConsumiveis,
  calcularPrecoTotal,
  metricasPapelA4,
  estatisticasTonerPorImpressoes,
  relatorioConsumoPorProvincia,
  exportPayloadRegistosPeriodo,
  exportPayloadMapaCompleto,
} from '../modules/consumiveis/consumiveis.service.js';
import {
  exportarRelatorioConsumoPorProvincia,
  exportarListaConsumiveisPeriodo,
  exportarMapaCompletoConsumiveis,
} from '../services/consumiveisExport.service.js';
import { guardarAnexosConsumiveis } from '../services/consumiveisAnexos.service.js';
import { obterDashboardExecutivo } from '../modules/custos/custosIntegracao.service.js';
import {
  relatorioMensalConsumiveis,
  relatorioAnualConsumiveis,
} from '../modules/consumiveis/consumiveisRelatorios.service.js';
import { exportarRelatorioConsumiveis } from '../services/consumiveisRelatoriosExport.service.js';

const consumiveisAnexosMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 25 },
});

async function catalogos(req, res, next) {
  try {
    const [provincias, departamentos] = await Promise.all([
      consumiveisRepository.listProvincias(),
      consumiveisRepository.listDepartamentos(),
    ]);
    res.json({ success: true, data: { provincias, departamentos } });
  } catch (e) {
    next(e);
  }
}

async function list(req, res, next) {
  try {
    const { count, rows } = await listarRegistos(req.query);
    res.json({
      success: true,
      data: rows.map((r) => r.toJSON()),
      meta: { total: count, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 25 },
    });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const body = { ...req.body };
    const preco_total = calcularPrecoTotal(body.quantidade, body.preco_unitario);
    const row = await consumiveisRepository.createRegisto({
      ...body,
      departamento_id: body.departamento_id || null,
      registado_por_id: req.user?.id || null,
      preco_total,
    });
    const full = await consumiveisRepository.findRegistoById(row.id);
    res.status(201).json({ success: true, data: full.toJSON() });
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const body = { ...req.body };
    if (body.departamento_id === '') body.departamento_id = null;
    if (body.quantidade != null || body.preco_unitario != null) {
      const cur = await consumiveisRepository.findRegistoById(req.params.id);
      if (!cur) {
        const err = new Error('Registo não encontrado');
        err.status = 404;
        throw err;
      }
      const q = body.quantidade != null ? body.quantidade : cur.quantidade;
      const pu = body.preco_unitario != null ? body.preco_unitario : cur.preco_unitario;
      body.preco_total = calcularPrecoTotal(q, pu);
    }
    const row = await consumiveisRepository.updateRegisto(req.params.id, body);
    if (!row) {
      const err = new Error('Registo não encontrado');
      err.status = 404;
      throw err;
    }
    res.json({ success: true, data: row.toJSON() });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const ok = await consumiveisRepository.deleteRegisto(req.params.id);
    if (!ok) {
      const err = new Error('Registo não encontrado');
      err.status = 404;
      throw err;
    }
    res.json({ success: true, data: { removido: true } });
  } catch (e) {
    next(e);
  }
}

function tiposAnexosDoBody(body, numFicheiros) {
  if (!numFicheiros) return [];
  let raw = body.documento_tipos;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) {
        const out = p.map((t) => String(t || '').trim());
        while (out.length < numFicheiros) out.push('outro');
        return out.slice(0, numFicheiros);
      }
    } catch {
      /* continuar */
    }
  }
  if (Array.isArray(raw)) {
    const out = raw.map((t) => String(t || '').trim());
    while (out.length < numFicheiros) out.push('outro');
    return out.slice(0, numFicheiros);
  }
  if (typeof raw === 'string' && raw.includes(',')) {
    const parts = raw.split(',').map((s) => s.trim());
    while (parts.length < numFicheiros) parts.push('outro');
    return parts.slice(0, numFicheiros);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return Array(numFicheiros).fill(raw.trim());
  }
  return Array(numFicheiros).fill('outro');
}

async function uploadAnexosConsumivel(req, res, next) {
  try {
    const registoId = req.params.id;
    const row = await consumiveisRepository.findRegistoById(registoId);
    if (!row) {
      const err = new Error('Registo não encontrado');
      err.status = 404;
      throw err;
    }
    const files = req.files || [];
    if (!files.length) {
      const err = new Error('Envie pelo menos um ficheiro no campo "files".');
      err.status = 400;
      throw err;
    }
    const tipos = tiposAnexosDoBody(req.body, files.length);
    const criados = await guardarAnexosConsumiveis(models, registoId, files, tipos);
    res.status(201).json({
      success: true,
      data: criados.map((c) => c.toJSON()),
    });
  } catch (e) {
    next(e);
  }
}

async function downloadAnexo(req, res, next) {
  try {
    const { id: registoId, anexoId } = req.params;
    const anexo = await consumiveisRepository.findAnexoPorRegisto(registoId, anexoId);
    if (!anexo) {
      const err = new Error('Anexo não encontrado');
      err.status = 404;
      throw err;
    }
    const abs = path.resolve(models.ConsumivelAnexo.absolutPath(anexo));
    const safeName = String(anexo.nome_original || 'anexo')
      .replace(/["\r\n]/g, '_')
      .replace(/[^\x20-\x7E]+/g, '_')
      .slice(0, 180);
    res.setHeader('Content-Type', anexo.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.sendFile(abs, (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (e) {
    next(e);
  }
}

async function removeAnexo(req, res, next) {
  try {
    const { id: registoId, anexoId } = req.params;
    const anexo = await consumiveisRepository.findAnexoPorRegisto(registoId, anexoId);
    if (!anexo) {
      const err = new Error('Anexo não encontrado');
      err.status = 404;
      throw err;
    }
    await anexo.destroy();
    res.json({ success: true, data: { removido: true } });
  } catch (e) {
    next(e);
  }
}

async function exportMapaCompleto(req, res, next) {
  try {
    const de = req.query.de?.trim() || null;
    const ate = req.query.ate?.trim() || null;
    if ((de && !ate) || (!de && ate)) {
      const err = new Error('Informe as duas datas ou deixe ambas em branco.');
      err.status = 400;
      throw err;
    }
    const formato = (req.query.formato || 'xlsx').toLowerCase();
    const data = await exportPayloadMapaCompleto({ de, ate });
    const { buffer, contentType, filename } = await exportarMapaCompletoConsumiveis(data, formato);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

async function exportRegistosPeriodo(req, res, next) {
  try {
    const de = req.query.de?.trim();
    const ate = req.query.ate?.trim();
    if (!de || !ate) {
      const err = new Error('Informe "de" e "ate" (AAAA-MM-DD).');
      err.status = 400;
      throw err;
    }
    if (de > ate) {
      const err = new Error('A data "de" não pode ser posterior à data "ate".');
      err.status = 400;
      throw err;
    }
    const formato = (req.query.formato || 'pdf').toLowerCase();
    const payload = await exportPayloadRegistosPeriodo({ de, ate });
    const { buffer, contentType, filename } = await exportarListaConsumiveisPeriodo(payload, formato);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

async function metricasPapel(req, res, next) {
  try {
    const row = await consumiveisRepository.findRegistoById(req.params.id);
    if (!row || row.tipo !== 'papel_a4') {
      const err = new Error('Registo não encontrado ou não é papel A4');
      err.status = 404;
      throw err;
    }
    res.json({ success: true, data: metricasPapelA4(row) });
  } catch (e) {
    next(e);
  }
}

async function relatorioPorProvincia(req, res, next) {
  try {
    const de = req.query.de?.trim() || null;
    const ate = req.query.ate?.trim() || null;
    if ((de && !ate) || (!de && ate)) {
      const err = new Error('Informe as duas datas (de e ate) ou deixe ambas em branco.');
      err.status = 400;
      throw err;
    }
    if (de && ate && de > ate) {
      const err = new Error('A data "de" não pode ser posterior à data "ate".');
      err.status = 400;
      throw err;
    }
    const data = await relatorioConsumoPorProvincia({ de, ate });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function exportRelatorioPorProvincia(req, res, next) {
  try {
    const de = req.query.de?.trim() || null;
    const ate = req.query.ate?.trim() || null;
    if ((de && !ate) || (!de && ate)) {
      const err = new Error('Informe as duas datas (de e ate) ou deixe ambas em branco.');
      err.status = 400;
      throw err;
    }
    if (de && ate && de > ate) {
      const err = new Error('A data "de" não pode ser posterior à data "ate".');
      err.status = 400;
      throw err;
    }
    const formato = (req.query.formato || 'pdf').toLowerCase();
    const data = await relatorioConsumoPorProvincia({ de, ate });
    const { buffer, contentType, filename } = await exportarRelatorioConsumoPorProvincia(data, formato);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

function queryRelatorioConsumiveis(req) {
  const q = { ...req.query };
  if (q.provinciaId === '') delete q.provinciaId;
  if (q.departamentoId === '') delete q.departamentoId;
  if (q.tipo === '') delete q.tipo;
  return q;
}

async function relatorioMensal(req, res, next) {
  try {
    const data = await relatorioMensalConsumiveis(queryRelatorioConsumiveis(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function relatorioAnual(req, res, next) {
  try {
    const data = await relatorioAnualConsumiveis(queryRelatorioConsumiveis(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function exportRelatorioMensal(req, res, next) {
  try {
    const formato = (req.query.formato || 'pdf').toLowerCase();
    const data = await relatorioMensalConsumiveis(queryRelatorioConsumiveis(req));
    const { buffer, contentType, filename } = await exportarRelatorioConsumiveis(data, formato);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

async function exportRelatorioAnual(req, res, next) {
  try {
    const formato = (req.query.formato || 'pdf').toLowerCase();
    const data = await relatorioAnualConsumiveis(queryRelatorioConsumiveis(req));
    const { buffer, contentType, filename } = await exportarRelatorioConsumiveis(data, formato);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

async function dashboard(req, res, next) {
  try {
    const [consum, executivo, alertasConsum] = await Promise.all([
      obterDashboardConsumiveis(),
      obterDashboardExecutivo().catch(() => null),
      obterAlertasConsumiveis(),
    ]);
    let toner = { folhas: 0, gray: 0, color: 0, duplex: 0, toner_estimado: 0 };
    try {
      toner = await estatisticasTonerPorImpressoes({});
    } catch {
      /* tabela pode não existir ainda */
    }
    let topPc = [];
    try {
      topPc = await models.PapercutLinha.findAll({
        attributes: [
          'usuario_papercut',
          [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
        ],
        where: {
          [Op.and]: [{ usuario_papercut: { [Op.ne]: null } }, { usuario_papercut: { [Op.ne]: '' } }],
        },
        group: ['usuario_papercut'],
        order: [[models.sequelize.literal('folhas'), 'DESC']],
        limit: 1,
        raw: true,
      });
    } catch {
      /* ignore */
    }

    res.json({
      success: true,
      data: {
        consumiveis: consum,
        executivo,
        alertas_consumiveis: alertasConsum,
        toner_impressoes_global: toner,
        maior_usuario_papercut: topPc[0] || null,
      },
    });
  } catch (e) {
    next(e);
  }
}

export {
  catalogos,
  list,
  create,
  update,
  remove,
  consumiveisAnexosMulter,
  uploadAnexosConsumivel,
  downloadAnexo,
  removeAnexo,
  exportRegistosPeriodo,
  exportMapaCompleto,
  metricasPapel,
  dashboard,
  relatorioPorProvincia,
  exportRelatorioPorProvincia,
  relatorioMensal,
  relatorioAnual,
  exportRelatorioMensal,
  exportRelatorioAnual,
};
