import models from '../../models/index.js';
import { Op } from 'sequelize';

export const papercutRepository = {
  async createJob(data) {
    return models.PapercutImportJob.create(data);
  },

  async updateJob(id, data) {
    const j = await models.PapercutImportJob.findByPk(id);
    if (!j) return null;
    await j.update(data);
    return j;
  },

  async findJob(id) {
    return models.PapercutImportJob.findByPk(id, {
      include: [
        { model: models.Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
        { model: models.Provincia, as: 'provincia', attributes: ['id', 'nome'] },
        { model: models.DepartamentoGestao, as: 'departamento', attributes: ['id', 'nome'] },
      ],
    });
  },

  async listJobs({ limit, offset }) {
    return models.PapercutImportJob.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: models.Provincia, as: 'provincia', attributes: ['id', 'nome'] },
        { model: models.DepartamentoGestao, as: 'departamento', attributes: ['id', 'nome'] },
      ],
    });
  },

  async bulkInsertLinhas(rows, { chunkSize = 400 } = {}) {
    let inserted = 0;
    let dup = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const created = await models.PapercutLinha.bulkCreate(chunk, {
        ignoreDuplicates: true,
        validate: false,
      });
      inserted += created.length;
      dup += chunk.length - created.length;
    }
    return { inserted, dup };
  },

  async sumarioLinhas(whereClause) {
    const [row] = await models.PapercutLinha.findAll({
      attributes: [
        [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
        [models.sequelize.fn('SUM', models.sequelize.col('paginas')), 'paginas'],
        [models.sequelize.fn('SUM', models.sequelize.col('copias')), 'copias'],
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'linhas'],
        [
          models.sequelize.fn(
            'SUM',
            models.sequelize.literal('CASE WHEN duplex = 1 THEN paginas * copias ELSE 0 END')
          ),
          'folhas_duplex',
        ],
        [
          models.sequelize.fn(
            'SUM',
            models.sequelize.literal('CASE WHEN grayscale = 1 THEN paginas * copias ELSE 0 END')
          ),
          'folhas_gray',
        ],
        [
          models.sequelize.fn(
            'SUM',
            models.sequelize.literal('CASE WHEN grayscale = 0 THEN paginas * copias ELSE 0 END')
          ),
          'folhas_nao_gray',
        ],
      ],
      where: whereClause,
      raw: true,
    });
    return row || {};
  },

  async topUsuarios(whereClause, limit = 10) {
    return models.PapercutLinha.findAll({
      attributes: [
        'usuario_papercut',
        [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
      ],
      where: {
        ...whereClause,
        [Op.and]: [
          { usuario_papercut: { [Op.ne]: null } },
          { usuario_papercut: { [Op.ne]: '' } },
        ],
      },
      group: ['usuario_papercut'],
      order: [[models.sequelize.literal('folhas'), 'DESC']],
      limit,
      raw: true,
    });
  },

  async listUtilizadoresComContagem() {
    const rows = await models.PapercutLinha.findAll({
      attributes: [
        'usuario_papercut',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'total_linhas'],
        [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'total_folhas'],
        [models.sequelize.fn('MIN', models.sequelize.col('imprimido_em')), 'primeira_impressao'],
        [models.sequelize.fn('MAX', models.sequelize.col('imprimido_em')), 'ultima_impressao'],
      ],
      where: {
        [Op.and]: [
          { usuario_papercut: { [Op.ne]: null } },
          { usuario_papercut: { [Op.ne]: '' } },
        ],
      },
      group: ['usuario_papercut'],
      order: [['usuario_papercut', 'ASC']],
      raw: true,
    });
    return rows;
  },

  async countLinhasByUsuario(usuario) {
    return models.PapercutLinha.count({
      where: { usuario_papercut: usuario },
    });
  },

  async deleteLinhasByUsuario(usuario) {
    return models.PapercutLinha.destroy({
      where: { usuario_papercut: usuario },
    });
  },

  async topImpressoras(whereClause, limit = 10) {
    return models.PapercutLinha.findAll({
      attributes: [
        'impressora',
        [models.sequelize.fn('SUM', models.sequelize.literal('paginas * copias')), 'folhas'],
      ],
      where: {
        ...whereClause,
        [Op.and]: [{ impressora: { [Op.ne]: null } }, { impressora: { [Op.ne]: '' } }],
      },
      group: ['impressora'],
      order: [[models.sequelize.literal('folhas'), 'DESC']],
      limit,
      raw: true,
    });
  },
};
