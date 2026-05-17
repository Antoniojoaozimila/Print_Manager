import { Op } from 'sequelize';
import models from '../models/index.js';
import { hashPassword, gerarTokenColetor } from '../services/authService.js';
import { registrarLog } from '../services/logService.js';

async function list(req, res, next) {
  try {
    const rows = await models.Usuario.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['nome', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const body = req.body;
    const exists = await models.Usuario.findOne({ where: { email: body.email.toLowerCase() } });
    if (exists) {
      const err = new Error('E-mail já cadastrado');
      err.status = 409;
      throw err;
    }
    const password_hash = await hashPassword(body.password);
    const token_acesso = gerarTokenColetor();
    const row = await models.Usuario.create({
      nome: body.nome,
      email: body.email.toLowerCase(),
      departamento: body.departamento || null,
      cargo: body.cargo || null,
      password_hash,
      token_acesso,
      ativo: body.ativo !== false,
      role: body.role || 'user',
    });
    await registrarLog({
      usuarioId: req.user.id,
      acao: 'USUARIO_CRIADO',
      detalhes: { id: row.id, email: row.email },
      ip: req.ip,
    });
    const json = row.toJSON();
    delete json.password_hash;
    res.status(201).json({ success: true, data: json });
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const row = await models.Usuario.findByPk(req.params.id);
    if (!row) {
      const err = new Error('Usuário não encontrado');
      err.status = 404;
      throw err;
    }
    const body = req.body;
    if (body.email && body.email.toLowerCase() !== row.email) {
      const clash = await models.Usuario.findOne({
        where: { email: body.email.toLowerCase(), id: { [Op.ne]: row.id } },
      });
      if (clash) {
        const err = new Error('E-mail já cadastrado');
        err.status = 409;
        throw err;
      }
      row.email = body.email.toLowerCase();
    }
    if (body.nome !== undefined) row.nome = body.nome;
    if (body.departamento !== undefined) row.departamento = body.departamento || null;
    if (body.cargo !== undefined) row.cargo = body.cargo || null;
    if (body.role !== undefined) row.role = body.role;
    if (body.ativo !== undefined) row.ativo = body.ativo;
    if (body.password) row.password_hash = await hashPassword(body.password);
    await row.save();
    await registrarLog({
      usuarioId: req.user.id,
      acao: 'USUARIO_ATUALIZADO',
      detalhes: { id: row.id },
      ip: req.ip,
    });
    const json = row.toJSON();
    delete json.password_hash;
    res.json({ success: true, data: json });
  } catch (e) {
    next(e);
  }
}

async function rotateToken(req, res, next) {
  try {
    const row = await models.Usuario.findByPk(req.params.id);
    if (!row) {
      const err = new Error('Usuário não encontrado');
      err.status = 404;
      throw err;
    }
    row.token_acesso = gerarTokenColetor();
    await row.save();
    await registrarLog({
      usuarioId: req.user.id,
      acao: 'TOKEN_COLETOR_REGENERADO',
      detalhes: { usuario_alvo: row.id },
      ip: req.ip,
    });
    res.json({ success: true, data: { id: row.id, token_acesso: row.token_acesso } });
  } catch (e) {
    next(e);
  }
}

export { list, create, update, rotateToken };
