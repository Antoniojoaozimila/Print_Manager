import models from '../../models/index.js';
import { Op } from 'sequelize';

export const consumiveisRepository = {
  async findRegistos({ where, limit, offset, order }) {
    return models.ConsumivelRegisto.findAndCountAll({
      where,
      limit,
      offset,
      order: order || [['data_aquisicao', 'DESC']],
      include: [
        { model: models.Provincia, as: 'provincia', attributes: ['id', 'nome'] },
        { model: models.DepartamentoGestao, as: 'departamento', attributes: ['id', 'nome'], required: false },
        {
          model: models.ConsumivelAnexo,
          as: 'anexos',
          required: false,
          attributes: ['id', 'nome_original', 'documento_tipo', 'mime_type', 'tamanho_bytes', 'created_at'],
        },
      ],
    });
  },

  async findRegistoById(id) {
    return models.ConsumivelRegisto.findByPk(id, {
      include: [
        { model: models.Provincia, as: 'provincia' },
        { model: models.DepartamentoGestao, as: 'departamento', required: false },
        {
          model: models.ConsumivelAnexo,
          as: 'anexos',
          required: false,
          attributes: [
            'id',
            'nome_original',
            'caminho_relativo',
            'mime_type',
            'tamanho_bytes',
            'documento_tipo',
            'created_at',
          ],
        },
      ],
    });
  },

  async findRegistosRelatorio(where) {
    return models.ConsumivelRegisto.findAll({
      where,
      include: [
        { model: models.Provincia, as: 'provincia', attributes: ['id', 'nome'] },
        { model: models.DepartamentoGestao, as: 'departamento', required: false, attributes: ['id', 'nome'] },
        {
          model: models.Usuario,
          as: 'registado_por',
          required: false,
          attributes: ['id', 'nome', 'email'],
        },
        {
          model: models.ConsumivelAnexo,
          as: 'anexos',
          required: false,
          attributes: ['id', 'nome_original', 'documento_tipo', 'mime_type', 'tamanho_bytes', 'created_at'],
        },
      ],
      order: [
        ['data_aquisicao', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  },

  async findRegistosPorPeriodoAquisicao({ de, ate }) {
    return models.ConsumivelRegisto.findAll({
      where: { data_aquisicao: { [Op.between]: [de, ate] } },
      include: [
        { model: models.Provincia, as: 'provincia', attributes: ['id', 'nome'] },
        { model: models.DepartamentoGestao, as: 'departamento', required: false, attributes: ['id', 'nome'] },
        {
          model: models.ConsumivelAnexo,
          as: 'anexos',
          required: false,
          attributes: [
            'id',
            'nome_original',
            'caminho_relativo',
            'mime_type',
            'tamanho_bytes',
            'documento_tipo',
            'created_at',
          ],
        },
      ],
      order: [
        ['data_aquisicao', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  },

  async findAnexoPorRegisto(registoId, anexoId) {
    return models.ConsumivelAnexo.findOne({
      where: { id: anexoId, consumivel_registo_id: registoId },
    });
  },

  async createRegisto(data) {
    return models.ConsumivelRegisto.create(data);
  },

  async updateRegisto(id, data) {
    const row = await models.ConsumivelRegisto.findByPk(id);
    if (!row) return null;
    await row.update(data);
    return row.reload({
      include: [
        { model: models.Provincia, as: 'provincia' },
        { model: models.DepartamentoGestao, as: 'departamento', required: false },
        {
          model: models.ConsumivelAnexo,
          as: 'anexos',
          required: false,
          attributes: [
            'id',
            'nome_original',
            'caminho_relativo',
            'mime_type',
            'tamanho_bytes',
            'documento_tipo',
            'created_at',
          ],
        },
      ],
    });
  },

  async deleteRegisto(id) {
    const row = await models.ConsumivelRegisto.findByPk(id, {
      include: [{ model: models.ConsumivelAnexo, as: 'anexos', required: false }],
    });
    if (!row) return false;
    for (const a of row.anexos || []) {
      await a.destroy();
    }
    await row.destroy();
    return true;
  },

  async listProvincias() {
    return models.Provincia.findAll({ where: { ativo: true }, order: [['ordem', 'ASC'], ['nome', 'ASC']] });
  },

  async listDepartamentos() {
    return models.DepartamentoGestao.findAll({
      where: { ativo: true },
      order: [['ordem', 'ASC'], ['nome', 'ASC']],
    });
  },

  async aggregateGastosPorDimensao({ de, ate }) {
    const { sequelize } = models;
    const replacements = { de, ate };
    let dateFilter = '';
    if (de && ate) {
      dateFilter = 'AND r.data_aquisicao BETWEEN :de AND :ate';
    }
    const [porDept] = await sequelize.query(
      `SELECT d.nome AS dimensao, SUM(r.preco_total) AS total
       FROM consumiveis_registos r
       INNER JOIN departamentos_gestao d ON d.id = r.departamento_id
       WHERE 1=1 ${dateFilter}
       GROUP BY d.id, d.nome
       ORDER BY total DESC`,
      { replacements: de && ate ? replacements : {} }
    );
    const [porProv] = await sequelize.query(
      `SELECT p.nome AS dimensao, SUM(r.preco_total) AS total
       FROM consumiveis_registos r
       INNER JOIN provincias p ON p.id = r.provincia_id
       WHERE 1=1 ${dateFilter}
       GROUP BY p.id, p.nome
       ORDER BY total DESC`,
      { replacements: de && ate ? replacements : {} }
    );
    return { porDepartamento: porDept, porProvincia: porProv };
  },
};
