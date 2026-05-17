import models from '../models/index.js';

async function registrarLog({ usuarioId, acao, detalhes, ip }) {
  return models.LogSistema.create({
    usuario_id: usuarioId || null,
    acao,
    detalhes: detalhes || null,
    ip_origem: ip || null,
  });
}

export { registrarLog };
