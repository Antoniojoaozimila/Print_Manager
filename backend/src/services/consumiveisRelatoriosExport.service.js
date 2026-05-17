import ExcelJS from 'exceljs';
import {
  IMPERIAL_BRAND,
  fetchImperialLogoBuffer,
  excelArgb,
  imageExtensionForWorkbook,
} from './imperialBrand.js';
import {
  n,
  fmtInt,
  fmtMoney,
  createPdfDocument,
  pdfDrawCoverHeader,
  pdfSectionTitle,
  pdfKpiGrid,
  pdfDataTable,
  pdfHorizontalBarChart,
  pdfFinalize,
  docxLogoParagraph,
  docxCoverBlock,
  docxHeading,
  docxSpacer,
  docxKeyValueTable,
  docxTable,
  buildDocxBuffer,
} from './imperialDocumentExport.js';

const TIPO_LABEL = {
  papel_a4: 'Papel A4 (caixas)',
  envelope: 'Envelopes',
  toner: 'Toner',
  agrafos: 'Agrafos',
};

function tituloPeriodo(data) {
  if (data.periodo?.tipo === 'mensal') {
    return `${String(data.periodo.mes).padStart(2, '0')}/${data.periodo.ano}`;
  }
  if (data.periodo?.tipo === 'anual') return `Ano ${data.periodo.ano}`;
  return `${data.periodo?.de} a ${data.periodo?.ate}`;
}

function filenameBase(data, formato) {
  const slug =
    data.periodo?.tipo === 'mensal'
      ? `${data.periodo.ano}-${String(data.periodo.mes).padStart(2, '0')}`
      : data.periodo?.tipo === 'anual'
        ? `${data.periodo.ano}`
        : `${data.periodo.de}_${data.periodo.ate}`;
  const kind = data.tipo === 'anual' ? 'anual' : 'mensal';
  const base = `imperial-consumiveis-${kind}-${slug}`;
  if (formato === 'xlsx' || formato === 'excel') return `${base}.xlsx`;
  if (formato === 'docx' || formato === 'word') return `${base}.docx`;
  return `${base}.pdf`;
}

function applyHeader(ws, wb, logoBuf, titulo, subtitulo, cols = 10) {
  ws.mergeCells(1, 1, 1, cols);
  const r1 = ws.getRow(1);
  r1.height = 46;
  r1.getCell(1).value = IMPERIAL_BRAND.company;
  r1.getCell(1).font = { bold: true, size: 15, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  r1.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
  };
  if (logoBuf && wb) {
    try {
      const ext = imageExtensionForWorkbook(logoBuf);
      const id = wb.addImage({ buffer: logoBuf, extension: ext });
      ws.addImage(id, { tl: { col: 0, row: 0, colOff: 90000, rowOff: 70000 }, ext: { width: 120, height: 40 } });
    } catch {
      /* ignorar */
    }
  }
  ws.mergeCells(2, 1, 2, cols);
  ws.getRow(2).getCell(1).value = titulo;
  ws.getRow(2).getCell(1).font = { bold: true, size: 12, color: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) } };
  ws.getRow(2).getCell(1).alignment = { horizontal: 'center' };
  ws.mergeCells(3, 1, 3, cols);
  ws.getRow(3).getCell(1).value = subtitulo;
  ws.getRow(3).getCell(1).font = { size: 10, color: { argb: excelArgb(IMPERIAL_BRAND.mutedTextHex) } };
  ws.getRow(3).getCell(1).alignment = { horizontal: 'center' };
  ws.addRow([]);
}

const COLS_LINHA = [
  'Província',
  'Departamento',
  'Tipo',
  'Quantidade',
  'Preço unit. (MZN)',
  'Preço total (MZN)',
  'Data aquisição',
  'Data término',
  'Responsável',
  'Observações',
];

function addLinhasSheet(ws, linhas) {
  ws.addRow(COLS_LINHA);
  ws.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
  ws.lastRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
  };
  for (const L of linhas) {
    const row = ws.addRow([
      L.provincia,
      L.departamento || '—',
      TIPO_LABEL[L.tipo] || L.tipo,
      n(L.quantidade),
      n(L.preco_unitario),
      n(L.preco_total),
      L.data_aquisicao,
      L.data_termino || '',
      L.responsavel || '—',
      L.observacoes || '',
    ]);
    row.getCell(5).numFmt = '#,##0.####';
    row.getCell(6).numFmt = '#,##0.00';
  }
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 20;
  ws.getColumn(10).width = 36;
}

export async function exportarRelatorioConsumiveis(data, formato) {
  const isAnual = data.tipo === 'anual';
  const titulo = isAnual
    ? `Relatório anual de consumíveis — ${data.periodo.ano}`
    : `Relatório mensal de consumíveis — ${tituloPeriodo(data)}`;
  const subtitulo = `Período: ${tituloPeriodo(data)} · Total: ${fmtMoney(data.totais?.total_gasto_mzn)} MZN · ${IMPERIAL_BRAND.website}`;
  const logoBuf = await fetchImperialLogoBuffer();
  const linhas = data.linhas || [];

  if (formato === 'xlsx' || formato === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.creator = IMPERIAL_BRAND.company;
    const ws = wb.addWorksheet('Detalhe');
    applyHeader(ws, wb, logoBuf, titulo, subtitulo, 10);
    ws.addRow(['Total de registos', n(data.totais?.num_registos)]);
    ws.addRow(['Total gasto (MZN)', n(data.totais?.total_gasto_mzn)]);
    ws.lastRow.getCell(2).numFmt = '#,##0.00';
    if (isAnual) {
      ws.addRow(['Média mensal gasto (MZN)', n(data.totais?.media_mensal_gasto_mzn)]);
      ws.lastRow.getCell(2).numFmt = '#,##0.00';
    }
    ws.addRow([]);
    addLinhasSheet(ws, linhas);

    if (isAnual) {
      const wsM = wb.addWorksheet('Comparação mensal');
      applyHeader(wsM, wb, logoBuf, `${titulo} — evolução mensal`, subtitulo, 4);
      wsM.addRow(['Mês', 'Nº registos', 'Total (MZN)']);
      wsM.lastRow.font = { bold: true };
      for (const c of data.comparacao_mensal || []) {
        const row = wsM.addRow([c.mes_label, n(c.num_registos), n(c.total_mzn)]);
        row.getCell(3).numFmt = '#,##0.00';
      }

      const wsP = wb.addWorksheet('Por província');
      applyHeader(wsP, wb, logoBuf, 'Total por província', subtitulo, 4);
      wsP.addRow(['Província', 'Registos', 'Total MZN']);
      wsP.lastRow.font = { bold: true };
      for (const r of data.total_por_provincia || []) {
        const row = wsP.addRow([r.provincia, n(r.num_registos), n(r.total_mzn)]);
        row.getCell(3).numFmt = '#,##0.00';
      }

      const wsD = wb.addWorksheet('Por departamento');
      applyHeader(wsD, wb, logoBuf, 'Total por departamento', subtitulo, 4);
      wsD.addRow(['Departamento', 'Registos', 'Total MZN']);
      wsD.lastRow.font = { bold: true };
      for (const r of data.total_por_departamento || []) {
        const row = wsD.addRow([r.departamento, n(r.num_registos), n(r.total_mzn)]);
        row.getCell(3).numFmt = '#,##0.00';
      }

      const wsT = wb.addWorksheet('Por tipo');
      applyHeader(wsT, wb, logoBuf, 'Total por tipo de consumível', subtitulo, 4);
      wsT.addRow(['Tipo', 'Registos', 'Quantidade', 'Total MZN']);
      wsT.lastRow.font = { bold: true };
      for (const t of data.resumo_por_tipo || []) {
        const row = wsT.addRow([TIPO_LABEL[t.tipo] || t.tipo, n(t.num_registos), n(t.quantidade), n(t.total_mzn)]);
        row.getCell(4).numFmt = '#,##0.00';
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: filenameBase(data, 'xlsx'),
    };
  }

  if (formato === 'docx' || formato === 'word') {
    const tableRows = linhas.map((L) => [
      L.provincia,
      L.departamento || '—',
      TIPO_LABEL[L.tipo] || L.tipo,
      fmtInt(L.quantidade),
      fmtMoney(L.preco_unitario),
      fmtMoney(L.preco_total),
      L.data_aquisicao,
      L.data_termino || '—',
      L.responsavel || '—',
      (L.observacoes || '').slice(0, 120),
    ]);

    const children = [
      ...docxLogoParagraph(logoBuf),
      ...docxCoverBlock({ titulo, subtitulo }),
      docxHeading('Resumo executivo'),
      ...docxKeyValueTable([
        ['Total de registos', fmtInt(data.totais?.num_registos)],
        ['Total gasto (MZN)', fmtMoney(data.totais?.total_gasto_mzn)],
        ...(isAnual ? [['Média mensal (MZN)', fmtMoney(data.totais?.media_mensal_gasto_mzn)]] : []),
      ]),
    ];

    if (isAnual && data.comparacao_mensal?.length) {
      children.push(
        docxHeading('Comparação mensal'),
        ...docxTable(
          [
            { header: 'Mês', width: 25 },
            { header: 'Registos', width: 20 },
            { header: 'Total (MZN)', width: 25 },
          ],
          data.comparacao_mensal.map((c) => [c.mes_label, fmtInt(c.num_registos), fmtMoney(c.total_mzn)])
        )
      );
    }

    if (isAnual && data.total_por_provincia?.length) {
      children.push(
        docxHeading('Total por província'),
        ...docxTable(
          [
            { header: 'Província', width: 40 },
            { header: 'Registos', width: 25 },
            { header: 'Total (MZN)', width: 35 },
          ],
          data.total_por_provincia.map((r) => [r.provincia, fmtInt(r.num_registos), fmtMoney(r.total_mzn)])
        )
      );
    }

    if (isAnual && data.resumo_por_tipo?.length) {
      children.push(
        docxHeading('Total por tipo'),
        ...docxTable(
          [
            { header: 'Tipo', width: 35 },
            { header: 'Registos', width: 20 },
            { header: 'Quantidade', width: 22 },
            { header: 'Total (MZN)', width: 23 },
          ],
          data.resumo_por_tipo.map((t) => [
            TIPO_LABEL[t.tipo] || t.tipo,
            fmtInt(t.num_registos),
            fmtInt(t.quantidade),
            fmtMoney(t.total_mzn),
          ])
        )
      );
    }

    children.push(
      docxHeading('Detalhe de aquisições'),
      ...docxTable(
        [
          { header: 'Província', width: 12 },
          { header: 'Departamento', width: 12 },
          { header: 'Tipo', width: 11 },
          { header: 'Qtd', width: 7 },
          { header: 'Unit.', width: 9 },
          { header: 'Total', width: 9 },
          { header: 'Aquisição', width: 9 },
          { header: 'Término', width: 8 },
          { header: 'Responsável', width: 11 },
          { header: 'Obs.', width: 12 },
        ],
        tableRows,
        { maxRows: 250 }
      )
    );

    const buffer = await buildDocxBuffer(children);
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: filenameBase(data, 'docx'),
    };
  }

  const { doc: docPdf, done } = createPdfDocument({ landscape: true, margin: 36 });
  docPdf.addPage();
  pdfDrawCoverHeader(docPdf, logoBuf, { titulo, subtitulo });

  pdfSectionTitle(docPdf, 'Resumo executivo');
  pdfKpiGrid(docPdf, [
    { label: 'Total de registos', value: fmtInt(data.totais?.num_registos) },
    { label: 'Total gasto (MZN)', value: fmtMoney(data.totais?.total_gasto_mzn) },
    ...(isAnual ? [{ label: 'Média mensal (MZN)', value: fmtMoney(data.totais?.media_mensal_gasto_mzn) }] : []),
    { label: 'Período', value: tituloPeriodo(data) },
  ]);

  if (isAnual && data.comparacao_mensal?.length) {
    pdfHorizontalBarChart(
      docPdf,
      'Evolução mensal de gastos',
      data.comparacao_mensal,
      (c) => c.mes_label,
      (c) => c.total_mzn,
      fmtMoney
    );
    pdfDataTable(
      docPdf,
      [
        { header: 'Mês', key: 'mes', width: 2 },
        { header: 'Registos', key: 'reg', width: 1 },
        { header: 'Total (MZN)', key: 'tot', width: 2 },
      ],
      data.comparacao_mensal.map((c) => ({
        mes: c.mes_label,
        reg: fmtInt(c.num_registos),
        tot: fmtMoney(c.total_mzn),
      }))
    );
  }

  pdfSectionTitle(docPdf, 'Detalhe de aquisições', `${linhas.length} linha(s)`);
  pdfDataTable(
    docPdf,
    [
      { header: 'Província', key: 'provincia', width: 1.2 },
      { header: 'Dept.', key: 'dept', width: 1 },
      { header: 'Tipo', key: 'tipo', width: 1.1 },
      { header: 'Qtd', key: 'qtd', width: 0.7 },
      { header: 'Unit.', key: 'unit', width: 0.9 },
      { header: 'Total', key: 'total', width: 0.9 },
      { header: 'Aquis.', key: 'aq', width: 0.8 },
      { header: 'Término', key: 'term', width: 0.8 },
      { header: 'Resp.', key: 'resp', width: 1 },
    ],
    linhas.map((L) => ({
      provincia: L.provincia,
      dept: (L.departamento || '—').slice(0, 18),
      tipo: (TIPO_LABEL[L.tipo] || L.tipo).slice(0, 16),
      qtd: fmtInt(L.quantidade),
      unit: fmtMoney(L.preco_unitario),
      total: fmtMoney(L.preco_total),
      aq: L.data_aquisicao,
      term: L.data_termino || '—',
      resp: (L.responsavel || '—').slice(0, 14),
    })),
    { fontSize: 7.5, maxRows: 400 }
  );

  const buffer = await pdfFinalize(docPdf, done, { emitidoEm: data.emitido_em });
  return {
    buffer,
    contentType: 'application/pdf',
    filename: filenameBase(data, 'pdf'),
  };
}
