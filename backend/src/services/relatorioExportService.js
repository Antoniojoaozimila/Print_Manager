import ExcelJS from 'exceljs';
import { Op } from 'sequelize';
import models from '../models/index.js';
import { calcularCustoPaginas } from './consumoService.js';
import { IMPERIAL_BRAND, fetchImperialLogoBuffer } from './imperialBrand.js';
import {
  n,
  fmtInt,
  fmtMoney,
  createPdfDocument,
  pdfDrawCoverHeader,
  pdfSectionTitle,
  pdfKpiGrid,
  pdfDataTable,
  pdfFinalize,
  docxLogoParagraph,
  docxCoverBlock,
  docxHeading,
  docxKeyValueTable,
  docxTable,
  buildDocxBuffer,
} from './imperialDocumentExport.js';

function mesRange(ano, mes) {
  const start = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const end = new Date(ano, mes, 0, 23, 59, 59, 999);
  return { start, end };
}

async function fetchRelatorioMensal({ ano, mes, usuarioIdFiltro }) {
  const { start, end } = mesRange(ano, mes);
  const where = { data_hora: { [Op.between]: [start, end] } };
  if (usuarioIdFiltro) {
    where.usuario_id = usuarioIdFiltro;
  }

  const jobs = await models.JobImpressao.findAll({
    where,
    include: [
      { model: models.Usuario, as: 'usuario', attributes: ['id', 'nome', 'email', 'departamento'] },
      { model: models.Impressora, as: 'impressora', attributes: ['id', 'nome'] },
    ],
    order: [['data_hora', 'DESC']],
  });

  const porUsuario = new Map();
  for (const j of jobs) {
    const uid = j.usuario_id;
    if (!porUsuario.has(uid)) {
      porUsuario.set(uid, {
        usuario: j.usuario,
        total_paginas: 0,
        color: 0,
        pb: 0,
        duplex: 0,
        simples: 0,
      });
    }
    const p = (j.num_paginas || 0) * (j.num_copias || 1);
    const agg = porUsuario.get(uid);
    agg.total_paginas += p;
    if (j.colorido) agg.color += p;
    else agg.pb += p;
    if (j.duplex) agg.duplex += p;
    else agg.simples += p;
  }

  const linhas = [...porUsuario.values()].map((r) => {
    const custo = calcularCustoPaginas({
      totalPb: r.pb,
      totalColor: r.color,
      totalDuplex: r.duplex,
    });
    const toner_estimado = Math.round(r.color * 1.2 + r.pb * 0.35);
    return { ...r, custo_estimado: custo, toner_estimado_pct: toner_estimado };
  });

  const totais = linhas.reduce(
    (acc, r) => {
      acc.paginas += r.total_paginas;
      acc.color += r.color;
      acc.pb += r.pb;
      acc.duplex += r.duplex;
      acc.simples += r.simples;
      acc.custo += r.custo_estimado;
      acc.toner += r.toner_estimado_pct;
      return acc;
    },
    { paginas: 0, color: 0, pb: 0, duplex: 0, simples: 0, custo: 0, toner: 0 }
  );

  return { start, end, jobs, linhas, totais, mes, ano };
}

async function exportarExcel({ ano, mes, usuarioIdFiltro }) {
  const { linhas, totais, mes: m, ano: y } = await fetchRelatorioMensal({ ano, mes, usuarioIdFiltro });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Relatório ${m}-${y}`);
  ws.columns = [
    { header: 'Usuário', key: 'nome', width: 28 },
    { header: 'Departamento', key: 'dep', width: 22 },
    { header: 'Total páginas', key: 'tp', width: 14 },
    { header: 'Colorido', key: 'c', width: 12 },
    { header: 'P&B', key: 'pb', width: 12 },
    { header: 'Duplex', key: 'dx', width: 12 },
    { header: 'Simples', key: 'sm', width: 12 },
    { header: 'Toner est. (índice)', key: 'tn', width: 18 },
    { header: 'Custo est.', key: 'custo', width: 14 },
  ];
  for (const r of linhas) {
    ws.addRow({
      nome: r.usuario?.nome,
      dep: r.usuario?.departamento || '',
      tp: r.total_paginas,
      c: r.color,
      pb: r.pb,
      dx: r.duplex,
      sm: r.simples,
      tn: r.toner_estimado_pct,
      custo: r.custo_estimado,
    });
  }
  ws.addRow({});
  ws.addRow({
    nome: 'TOTAL',
    dep: '',
    tp: totais.paginas,
    c: totais.color,
    pb: totais.pb,
    dx: totais.duplex,
    sm: totais.simples,
    tn: totais.toner,
    custo: Math.round(totais.custo * 10000) / 10000,
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function exportarPdf({ ano, mes, usuarioIdFiltro }) {
  const { linhas, totais, mes: m, ano: y } = await fetchRelatorioMensal({ ano, mes, usuarioIdFiltro });
  const periodoTxt = `${String(m).padStart(2, '0')}/${y}`;
  const titulo = `Relatório mensal de impressões — ${periodoTxt}`;
  const logoBuf = await fetchImperialLogoBuffer();

  const { doc, done } = createPdfDocument({ margin: 44 });
  doc.addPage();
  pdfDrawCoverHeader(doc, logoBuf, { titulo, subtitulo: `Coletor de impressões  ·  ${IMPERIAL_BRAND.website}` });

  pdfSectionTitle(doc, 'Resumo do período');
  pdfKpiGrid(doc, [
    { label: 'Total páginas', value: fmtInt(totais.paginas) },
    { label: 'Colorido', value: fmtInt(totais.color) },
    { label: 'P&B', value: fmtInt(totais.pb) },
    { label: 'Duplex', value: fmtInt(totais.duplex) },
    { label: 'Custo estimado', value: fmtMoney(totais.custo) },
    { label: 'Índice toner', value: fmtInt(totais.toner) },
  ]);

  pdfSectionTitle(doc, 'Detalhe por utilizador');
  pdfDataTable(
    doc,
    [
      { header: 'Utilizador', key: 'nome', width: 1.4 },
      { header: 'Dept.', key: 'dep', width: 1 },
      { header: 'Páginas', key: 'pag', width: 0.8 },
      { header: 'Cor', key: 'cor', width: 0.6 },
      { header: 'P&B', key: 'pb', width: 0.6 },
      { header: 'Duplex', key: 'dx', width: 0.7 },
      { header: 'Custo', key: 'custo', width: 0.9 },
    ],
    linhas.map((r) => ({
      nome: r.usuario?.nome || '—',
      dep: (r.usuario?.departamento || '—').slice(0, 18),
      pag: fmtInt(r.total_paginas),
      cor: fmtInt(r.color),
      pb: fmtInt(r.pb),
      dx: fmtInt(r.duplex),
      custo: fmtMoney(r.custo_estimado),
    })),
    { fontSize: 8 }
  );

  return pdfFinalize(doc, done);
}

async function exportarWord({ ano, mes, usuarioIdFiltro }) {
  const { linhas, totais, mes: m, ano: y } = await fetchRelatorioMensal({ ano, mes, usuarioIdFiltro });
  const periodoTxt = `${String(m).padStart(2, '0')}/${y}`;
  const titulo = `Relatório mensal de impressões — ${periodoTxt}`;
  const logoBuf = await fetchImperialLogoBuffer();

  const buffer = await buildDocxBuffer([
    ...docxLogoParagraph(logoBuf),
    ...docxCoverBlock({ titulo, subtitulo: `Coletor de impressões  ·  ${IMPERIAL_BRAND.website}` }),
    docxHeading('Resumo do período'),
    ...docxKeyValueTable([
      ['Total páginas', fmtInt(totais.paginas)],
      ['Colorido', fmtInt(totais.color)],
      ['P&B', fmtInt(totais.pb)],
      ['Duplex', fmtInt(totais.duplex)],
      ['Simples', fmtInt(totais.simples)],
      ['Custo estimado', fmtMoney(totais.custo)],
      ['Índice toner', fmtInt(totais.toner)],
    ]),
    docxHeading('Detalhe por utilizador'),
    ...docxTable(
      [
        { header: 'Utilizador', width: 22 },
        { header: 'Departamento', width: 16 },
        { header: 'Páginas', width: 10 },
        { header: 'Cor', width: 8 },
        { header: 'P&B', width: 8 },
        { header: 'Duplex', width: 9 },
        { header: 'Custo est.', width: 12 },
      ],
      linhas.map((r) => [
        r.usuario?.nome || '—',
        r.usuario?.departamento || '—',
        fmtInt(r.total_paginas),
        fmtInt(r.color),
        fmtInt(r.pb),
        fmtInt(r.duplex),
        fmtMoney(r.custo_estimado),
      ])
    ),
  ]);

  return buffer;
}

export { fetchRelatorioMensal, exportarExcel, exportarPdf, exportarWord };
