import jwt from 'jsonwebtoken';
import models from '../models/index.js';

async function authJwt(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      const err = new Error('Token não informado');
      err.status = 401;
      throw err;
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await models.Usuario.findByPk(payload.sub);
    if (!usuario || !usuario.ativo) {
      const err = new Error('Usuário inválido ou inativo');
      err.status = 401;
      throw err;
    }
    req.user = usuario;
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      e.status = 401;
      e.message = 'Token inválido ou expirado';
    }
    next(e);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    const err = new Error('Acesso restrito a administradores');
    err.status = 403;
    return next(err);
  }
  next();
}

export { authJwt, requireAdmin };
