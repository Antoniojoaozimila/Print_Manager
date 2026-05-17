import models from '../models/index.js';

async function list(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = (page - 1) * limit;

    const { rows, count } = await models.LogSistema.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [{ model: models.Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] }],
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
