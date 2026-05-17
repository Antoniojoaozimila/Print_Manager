import { Op } from 'sequelize';
import models from '../models/index.js';

function buildWhere(req) {
  const { de, ate, usuarioId } = req.query;
  const where = {};
  if (de || ate) {
    where.data_hora = {};
    if (de) where.data_hora[Op.gte] = new Date(de);
    if (ate) where.data_hora[Op.lte] = new Date(ate);
  }
  if (req.user.role !== 'admin') {
    where.usuario_id = req.user.id;
  } else if (usuarioId) {
    where.usuario_id = usuarioId;
  }
  return where;
}

async function list(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const where = buildWhere(req);

    const { rows, count } = await models.JobImpressao.findAndCountAll({
      where,
      limit,
      offset,
      order: [['data_hora', 'DESC']],
      include: [
        { model: models.Usuario, as: 'usuario', attributes: ['id', 'nome', 'email', 'departamento'] },
        { model: models.Impressora, as: 'impressora', attributes: ['id', 'nome', 'localizacao', 'tipo'] },
      ],
    });

    res.json({
      success: true,
      data: rows,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
    });
  } catch (e) {
    next(e);
  }
}

export { list };
