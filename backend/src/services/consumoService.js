import { Op } from 'sequelize';
import models from '../models/index.js';

function primeiroDiaMes(data) {
  const d = new Date(data);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function formatMesAno(date) {
  const d = primeiroDiaMes(date);
  return d.toISOString().slice(0, 10);
}

function calcularCustoPaginas({ totalPb, totalColor, totalDuplex }) {
  const precoPb = parseFloat(process.env.PRECO_PAGINA_PB || '0.02');
  const precoColor = parseFloat(process.env.PRECO_PAGINA_COLOR || '0.08');
  const descontoDuplex = parseFloat(process.env.PRECO_PAGINA_DUPLEX_DESCONTO || '0.1');

  let custo = totalPb * precoPb + totalColor * precoColor;
  custo -= custo * descontoDuplex * Math.min(totalDuplex / (totalPb + totalColor || 1), 1) * 0.01;
  if (custo < 0) custo = 0;
  return Math.round(custo * 10000) / 10000;
}

async function recalcularMesParaUsuario(usuarioId, referenciaData) {
  const inicio = primeiroDiaMes(referenciaData);
  const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const jobs = await models.JobImpressao.findAll({
    where: {
      usuario_id: usuarioId,
      data_hora: { [Op.between]: [inicio, fim] },
    },
  });

  let total_paginas = 0;
  let total_coloridas = 0;
  let total_pb = 0;
  let total_duplex = 0;

  for (const j of jobs) {
    const p = (j.num_paginas || 0) * (j.num_copias || 1);
    total_paginas += p;
    if (j.colorido) total_coloridas += p;
    else total_pb += p;
    if (j.duplex) total_duplex += p;
  }

  const custo_estimado = calcularCustoPaginas({
    totalPb: total_pb,
    totalColor: total_coloridas,
    totalDuplex: total_duplex,
  });

  const mes_ano = formatMesAno(inicio);

  const [row] = await models.ConsumoMensal.findOrCreate({
    where: { usuario_id: usuarioId, mes_ano },
    defaults: {
      usuario_id: usuarioId,
      mes_ano,
      total_paginas,
      total_coloridas,
      total_pb,
      total_duplex,
      custo_estimado,
    },
  });

  if (!row.isNewRecord) {
    await row.update({ total_paginas, total_coloridas, total_pb, total_duplex, custo_estimado });
  }

  return row;
}

export {
  recalcularMesParaUsuario,
  primeiroDiaMes,
  formatMesAno,
  calcularCustoPaginas,
};
