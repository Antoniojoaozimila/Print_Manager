import models from '../models/index.js';
import { recalcularMesParaUsuario } from '../services/consumoService.js';
import {
  ensureImpressoraParaJob,
  ensureUsuarioColeta,
  upsertImpressoraDescoberta,
} from '../services/coletaProvisionService.js';

async function postJobs(req, res, next) {
  try {
    const collectorUser = req.collectorUser;
    const criados = [];
    const mesesPorUsuario = new Map();

    function addMes(usuarioId, data_hora) {
      const d = new Date(data_hora);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (!mesesPorUsuario.has(usuarioId)) mesesPorUsuario.set(usuarioId, new Set());
      mesesPorUsuario.get(usuarioId).add(key);
    }

    for (const j of req.body.jobs) {
      const usuarioJob = await ensureUsuarioColeta({
        identificador_windows: j.identificador_windows,
        nome_usuario_exibicao: j.nome_usuario_exibicao,
        fallbackUsuario: collectorUser,
      });

      const impressora_id = await ensureImpressoraParaJob({
        nome: j.impressora_nome,
        ip: j.impressora_ip,
      });
      const data_hora = new Date(j.data_hora);
      const row = await models.JobImpressao.create({
        usuario_id: usuarioJob.id,
        impressora_id,
        data_hora,
        num_paginas: j.num_paginas,
        num_copias: j.num_copias ?? 1,
        colorido: !!j.colorido,
        duplex: !!j.duplex,
        tamanho_papel: j.tamanho_papel || null,
        formato_arquivo: j.formato_arquivo || null,
        tamanho_kb: j.tamanho_kb ?? null,
        nome_arquivo: j.nome_arquivo || null,
        nome_usuario_exibicao: j.nome_usuario_exibicao || usuarioJob.nome,
        computador_origem: j.computador_origem || null,
      });
      criados.push(row.id);
      addMes(usuarioJob.id, data_hora);
    }

    for (const [usuarioId, meses] of mesesPorUsuario) {
      for (const key of meses) {
        const [y, m] = key.split('-').map(Number);
        await recalcularMesParaUsuario(usuarioId, new Date(Date.UTC(y, m, 15)));
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('print_job_batch', {
        count: criados.length,
        usuarios_afetados: mesesPorUsuario.size,
      });
    }

    res.status(201).json({ success: true, data: { recebidos: criados.length, ids: criados } });
  } catch (e) {
    next(e);
  }
}

async function postPrinters(req, res, next) {
  try {
    const list = req.body.printers || [];
    let sincronizadas = 0;
    for (const p of list) {
      await upsertImpressoraDescoberta({
        nome: p.nome,
        ip_rede: p.ip_rede || null,
        localizacao: p.localizacao || null,
      });
      sincronizadas += 1;
    }
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('impressoras_sincronizadas', { count: sincronizadas });
    }
    res.status(200).json({ success: true, data: { sincronizadas } });
  } catch (e) {
    next(e);
  }
}

export { postJobs, postPrinters };
