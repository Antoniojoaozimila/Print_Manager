import { Op, fn, col, literal, QueryTypes } from 'sequelize';
import models from '../models/index.js';

function startEndPreset(preset) {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);
  if (preset === 'day') {
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'week') {
    start.setDate(now.getDate() - 7);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  return { start, end };
}

async function kpis(req, res, next) {
  try {
    const preset = req.query.periodo || 'mes';
    const { start, end } = startEndPreset(preset);

    const baseWhere = { data_hora: { [Op.between]: [start, end] } };
    if (req.user.role !== 'admin') {
      baseWhere.usuario_id = req.user.id;
    }

    const jobs = await models.JobImpressao.findAll({
      where: baseWhere,
      attributes: [
        [fn('COALESCE', fn('SUM', literal('num_paginas * num_copias')), 0), 'total_paginas'],
        [fn('COALESCE', fn('SUM', literal("CASE WHEN colorido THEN num_paginas * num_copias ELSE 0 END")), 0), 'color'],
        [fn('COALESCE', fn('SUM', literal("CASE WHEN NOT colorido THEN num_paginas * num_copias ELSE 0 END")), 0), 'pb'],
        [fn('COALESCE', fn('SUM', literal("CASE WHEN duplex THEN num_paginas * num_copias ELSE 0 END")), 0), 'duplex'],
      ],
      raw: true,
    });

    const row = jobs[0] || {};

    let prevStart;
    let prevEnd;
    if (preset === 'day') {
      prevEnd = new Date(start);
      prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd);
      prevStart.setHours(0, 0, 0, 0);
    } else if (preset === 'week') {
      prevEnd = new Date(start);
      prevEnd.setMilliseconds(-1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 7);
    } else {
      prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
    }

    const prevWhere = { data_hora: { [Op.between]: [prevStart, prevEnd] } };
    if (req.user.role !== 'admin') {
      prevWhere.usuario_id = req.user.id;
    }
    const prevAgg = await models.JobImpressao.findAll({
      where: prevWhere,
      attributes: [[fn('COALESCE', fn('SUM', literal('num_paginas * num_copias')), 0), 'total_paginas']],
      raw: true,
    });
    const prevTotal = Number(prevAgg[0]?.total_paginas || 0);
    const curTotal = Number(row.total_paginas || 0);
    const variacaoPct = prevTotal ? Math.round(((curTotal - prevTotal) / prevTotal) * 1000) / 10 : null;

    let porUsuario = [];
    let porDepartamento = [];
    if (req.user.role === 'admin') {
      porUsuario = await models.sequelize.query(
        `SELECT u.id, u.nome, u.departamento,
                CAST(COALESCE(SUM(j.num_paginas * j.num_copias), 0) AS SIGNED) AS paginas
         FROM jobs_impressao j
         INNER JOIN usuarios u ON u.id = j.usuario_id
         WHERE j.data_hora BETWEEN :start AND :end
         GROUP BY u.id, u.nome, u.departamento
         ORDER BY paginas DESC`,
        { replacements: { start, end }, type: QueryTypes.SELECT }
      );

      porDepartamento = await models.sequelize.query(
        `SELECT COALESCE(u.departamento, '(sem)') AS departamento,
                CAST(COALESCE(SUM(j.num_paginas * j.num_copias), 0) AS SIGNED) AS paginas
         FROM jobs_impressao j
         INNER JOIN usuarios u ON u.id = j.usuario_id
         WHERE j.data_hora BETWEEN :start AND :end
         GROUP BY COALESCE(u.departamento, '(sem)')
         ORDER BY paginas DESC`,
        { replacements: { start, end }, type: QueryTypes.SELECT }
      );
    }

    res.json({
      success: true,
      data: {
        periodo: preset,
        total_paginas: curTotal,
        total_color: Number(row.color || 0),
        total_pb: Number(row.pb || 0),
        total_duplex: Number(row.duplex || 0),
        comparativo_mes_anterior_pct: variacaoPct,
        por_usuario: porUsuario,
        por_departamento: porDepartamento,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function tendencia(req, res, next) {
  try {
    const dias = Number(req.query.dias) || 14;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - dias);
    start.setHours(0, 0, 0, 0);

    const where = { data_hora: { [Op.between]: [start, end] } };
    if (req.user.role !== 'admin') {
      where.usuario_id = req.user.id;
    }

    const rows = await models.JobImpressao.findAll({
      where,
      attributes: [
        [fn('DATE', col('data_hora')), 'dia'],
        [fn('SUM', literal('num_paginas * num_copias')), 'paginas'],
      ],
      group: [fn('DATE', col('data_hora'))],
      order: [[fn('DATE', col('data_hora')), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
}

export { kpis, tendencia };
