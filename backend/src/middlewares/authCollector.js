import models from '../models/index.js';

async function authCollector(req, res, next) {
  try {
    const token = req.headers['x-collector-token'] || req.body?.token_acesso;
    if (!token) {
      const err = new Error('Token do coletor obrigatório');
      err.status = 401;
      throw err;
    }
    const usuario = await models.Usuario.findOne({
      where: { token_acesso: String(token), ativo: true },
    });
    if (!usuario) {
      const err = new Error('Token inválido ou usuário inativo');
      err.status = 401;
      throw err;
    }
    req.collectorUser = usuario;
    next();
  } catch (e) {
    next(e);
  }
}

export { authCollector };
