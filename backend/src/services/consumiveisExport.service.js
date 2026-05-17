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

function periodoTxt(data) {
  if (data.filtros?.de && data.filtros?.ate) return `${data.filtros.de} a ${data.filtros.ate}`;
  return 'Todo o período';
}

function filenameConsumiveisProv(data, formato) {
  const slug =
    data.filtros?.de && data.filtros?.ate
      ? `${data.filtros.de}_${data.filtros.ate}`
      : 'completo';
  const base = `imperial-consumiveis-provincias-${slug}`;
  if (formato === 'xlsx' || formato === 'excel') return `${base}.xlsx`;
  if (formato === 'docx' || formato === 'word') return `${base}.docx`;
  return `${base}.pdf`;
}

function applyExcelHeader(ws, wb, logoBuf, tituloRelatorio, subtitulo, extraLine = '') {
  ws.mergeCells(1, 1, 1, 10);
  const r1 = ws.getRow(1);
  r1.height = 46;
  const c1 = r1.getCell(1);
  c1.value = IMPERIAL_BRAND.company;
  c1.font = { bold: true, size: 15, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
  c1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  c1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
  };
  if (logoBuf && wb) {
    try {
      const ext = imageExtensionForWorkbook(logoBuf);
      const id = wb.addImage({ buffer: logoBuf, extension: ext });
      ws.addImage(id, { tl: { col: 0, row: 0, colOff: 90_000, rowOff: 70_000 }, ext: { width: 120, height: 40 } });
    } catch {
      /* ignorar */
    }
  }

  ws.mergeCells(2, 1, 2, 10);
  ws.getRow(2).getCell(1).value = tituloRelatorio;
  ws.getRow(2).getCell(1).font = { bold: true, size: 12, color: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) } };
  ws.getRow(2).getCell(1).alignment = { horizontal: 'center' };

  ws.mergeCells(3, 1, 3, 10);
  ws.getRow(3).getCell(1).value = [subtitulo, IMPERIAL_BRAND.website, extraLine].filter(Boolean).join('  ·  ');
  ws.getRow(3).getCell(1).font = { size: 10, color: { argb: excelArgb(IMPERIAL_BRAND.mutedTextHex) } };
  ws.getRow(3).getCell(1).alignment = { horizontal: 'center' };

  ws.addRow([]);
  const bar = ws.addRow([]);
  ws.mergeCells(5, 1, 5, 10);
  bar.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.secondaryHex) },
  };
  bar.height = 6;
}

/**
 * @param {object} data — resultado de `relatorioConsumoPorProvincia`
 */
export async function exportarRelatorioConsumoPorProvincia(data, formato) {
  const titulo = 'Relatório de consumo de consumíveis por província / distrito';
  const sub = `${periodoTxt(data)}  ·  ${data.filtros?.descricao || ''}`;
  const logoBuf = await fetchImperialLogoBuffer();
  const porProv = data.por_provincia || [];
  const chartRows = porProv.map((r) => ({ label: r.provincia, gasto: r.gasto_mzn }));

  if (formato === 'xlsx' || formato === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.creator = IMPERIAL_BRAND.company;
    const ws = wb.addWorksheet('Resumo', { views: [{ showGridLines: true }] });
    applyExcelHeader(ws, wb, logoBuf, titulo, sub, 'Balcões = províncias/distritos no sistema');

    ws.addRow(['Indicador', 'Valor']);
    ws.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    ws.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    ws.addRow(['Total de registos (linhas)', n(data.totais?.num_registos)]);
    const rGasto = ws.addRow(['Gasto total (MZN)', n(data.totais?.gasto_mzn)]);
    rGasto.getCell(2).numFmt = '#,##0.00';
    ws.getColumn(1).width = 42;
    ws.getColumn(2).width = 22;

    const wsTipo = wb.addWorksheet('Por tipo (global)');
    applyExcelHeader(wsTipo, wb, logoBuf, `${titulo} — agregado por tipo`, sub, '');
    wsTipo.addRow(['Tipo', 'Nº registos', 'Quantidade', 'Gasto (MZN)']);
    wsTipo.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    wsTipo.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const t of data.resumo_por_tipo || []) {
      const row = wsTipo.addRow([TIPO_LABEL[t.tipo] || t.tipo, n(t.num_registos), n(t.quantidade), n(t.gasto_mzn)]);
      row.getCell(4).numFmt = '#,##0.00';
    }
    wsTipo.getColumn(1).width = 28;
    wsTipo.getColumn(2).width = 14;
    wsTipo.getColumn(3).width = 16;
    wsTipo.getColumn(4).width = 16;

    const wsP = wb.addWorksheet('Por província');
    applyExcelHeader(wsP, wb, logoBuf, `${titulo} — detalhe por balcão`, sub, '');
    const head = [
      'Província / distrito',
      'Nº registos',
      'Gasto total (MZN)',
      'Caixas A4',
      'Gasto A4',
      'Envelopes (qtd)',
      'Gasto env.',
      'Toner (qtd)',
      'Gasto toner',
      'Agrafos (qtd)',
      'Gasto agrafos',
    ];
    wsP.addRow(head);
    wsP.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    wsP.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const r of porProv) {
      const pt = r.por_tipo || {};
      wsP.addRow([
        r.provincia,
        n(r.num_registos),
        n(r.gasto_mzn),
        n(pt.papel_a4?.quantidade),
        n(pt.papel_a4?.gasto_mzn),
        n(pt.envelope?.quantidade),
        n(pt.envelope?.gasto_mzn),
        n(pt.toner?.quantidade),
        n(pt.toner?.gasto_mzn),
        n(pt.agrafos?.quantidade),
        n(pt.agrafos?.gasto_mzn),
      ]);
    }
    wsP.getColumn(2).numFmt = '#,##0';
    [3, 5, 7, 9, 11].forEach((c) => {
      wsP.getColumn(c).numFmt = '#,##0.00';
    });
    [4, 6, 8, 10].forEach((c) => {
      wsP.getColumn(c).numFmt = '#,##0.##';
    });
    wsP.getColumn(1).width = 30;
    for (let i = 2; i <= 11; i += 1) {
      wsP.getColumn(i).width = 14;
    }

    const lastP = wsP.rowCount;
    if (lastP >= 7) {
      wsP.addConditionalFormatting({
        ref: `C7:C${lastP}`,
        rules: [
          {
            type: 'dataBar',
            cfvo: [{ type: 'min' }, { type: 'max' }],
            color: { argb: excelArgb(IMPERIAL_BRAND.chartBarHex) },
          },
        ],
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: filenameConsumiveisProv(data, 'xlsx'),
    };
  }

  if (formato === 'docx' || formato === 'word') {
    const provRows = porProv.map((r) => {
      const pt = r.por_tipo || {};
      return [
        r.provincia,
        fmtInt(r.num_registos),
        fmtMoney(r.gasto_mzn),
        fmtInt(pt.papel_a4?.quantidade),
        fmtMoney(pt.papel_a4?.gasto_mzn),
        fmtInt(pt.envelope?.quantidade),
        fmtMoney(pt.envelope?.gasto_mzn),
        fmtInt(pt.toner?.quantidade),
        fmtMoney(pt.toner?.gasto_mzn),
        fmtInt(pt.agrafos?.quantidade),
        fmtMoney(pt.agrafos?.gasto_mzn),
      ];
    });

    const buffer = await buildDocxBuffer([
      ...docxLogoParagraph(logoBuf),
      ...docxCoverBlock({ titulo, subtitulo: sub }),
      docxHeading('Totais globais'),
      ...docxKeyValueTable([
        ['Registos', fmtInt(data.totais?.num_registos)],
        ['Gasto total (MZN)', fmtMoney(data.totais?.gasto_mzn)],
      ]),
      docxHeading('Resumo por tipo'),
      ...docxTable(
        [
          { header: 'Tipo', width: 30 },
          { header: 'Registos', width: 20 },
          { header: 'Quantidade', width: 25 },
          { header: 'Gasto (MZN)', width: 25 },
        ],
        (data.resumo_por_tipo || []).map((t) => [
          TIPO_LABEL[t.tipo] || t.tipo,
          fmtInt(t.num_registos),
          fmtInt(t.quantidade),
          fmtMoney(t.gasto_mzn),
        ])
      ),
      docxHeading('Detalhe por província / distrito'),
      ...docxTable(
        [
          { header: 'Província', width: 14 },
          { header: 'Reg.', width: 7 },
          { header: 'Total', width: 9 },
          { header: 'Cx A4', width: 7 },
          { header: '$ A4', width: 8 },
          { header: 'Env.', width: 6 },
          { header: '$ Env.', width: 8 },
          { header: 'Ton.', width: 6 },
          { header: '$ Ton.', width: 8 },
          { header: 'Agr.', width: 6 },
          { header: '$ Agr.', width: 8 },
        ],
        provRows
      ),
    ]);
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: filenameConsumiveisProv(data, 'docx'),
    };
  }

  const { doc: docPdf, done } = createPdfDocument({ margin: 44 });
  docPdf.addPage();
  pdfDrawCoverHeader(docPdf, logoBuf, { titulo, subtitulo: sub, extra: 'Balcões = províncias/distritos' });

  pdfSectionTitle(docPdf, 'Totais globais');
  pdfKpiGrid(docPdf, [
    { label: 'Registos', value: fmtInt(data.totais?.num_registos) },
    { label: 'Gasto total (MZN)', value: fmtMoney(data.totais?.gasto_mzn) },
  ]);

  pdfSectionTitle(docPdf, 'Resumo por tipo de consumível');
  pdfDataTable(
    docPdf,
    [
      { header: 'Tipo', key: 'tipo', width: 2 },
      { header: 'Registos', key: 'reg', width: 1 },
      { header: 'Quantidade', key: 'qtd', width: 1 },
      { header: 'Gasto (MZN)', key: 'gasto', width: 1.5 },
    ],
    (data.resumo_por_tipo || []).map((t) => ({
      tipo: TIPO_LABEL[t.tipo] || t.tipo,
      reg: fmtInt(t.num_registos),
      qtd: fmtInt(t.quantidade),
      gasto: fmtMoney(t.gasto_mzn),
    }))
  );

  pdfHorizontalBarChart(docPdf, 'Gasto por província / distrito (MZN)', chartRows, (r) => r.label, (r) => r.gasto, fmtMoney);

  pdfSectionTitle(docPdf, 'Detalhe por província / distrito');
  pdfDataTable(
    docPdf,
    [
      { header: 'Província', key: 'prov', width: 1.4 },
      { header: 'Reg.', key: 'reg', width: 0.6 },
      { header: 'Total', key: 'tot', width: 0.9 },
      { header: 'Cx A4', key: 'a4q', width: 0.6 },
      { header: '$ A4', key: 'a4g', width: 0.8 },
      { header: 'Toner qtd', key: 'tq', width: 0.7 },
      { header: '$ Toner', key: 'tg', width: 0.8 },
    ],
    porProv.map((r) => {
      const pt = r.por_tipo || {};
      return {
        prov: r.provincia,
        reg: fmtInt(r.num_registos),
        tot: fmtMoney(r.gasto_mzn),
        a4q: fmtInt(pt.papel_a4?.quantidade),
        a4g: fmtMoney(pt.papel_a4?.gasto_mzn),
        tq: fmtInt(pt.toner?.quantidade),
        tg: fmtMoney(pt.toner?.gasto_mzn),
      };
    }),
    { fontSize: 7.5 }
  );

  const buffer = await pdfFinalize(docPdf, done, { emitidoEm: data.emitido_em });
  return {
    buffer,
    contentType: 'application/pdf',
    filename: filenameConsumiveisProv(data, 'pdf'),
  };
}

const DOC_TIPO_LABEL = {
  cotacao: 'Cotação',
  fatura: 'Fatura',
  recibo: 'Recibo',
  comprovativo_pagamento: 'Comprovativo',
  outro: 'Outro',
};

function filenameListaConsumiveisPeriodo(data, formato) {
  const slug = `${data.filtros.de}_${data.filtros.ate}`;
  const base = `imperial-consumiveis-detalhe-${slug}`;
  if (formato === 'xlsx' || formato === 'excel') return `${base}.xlsx`;
  if (formato === 'docx' || formato === 'word') return `${base}.docx`;
  return `${base}.pdf`;
}

function anexosResumo(linha) {
  const a = linha.anexos || [];
  if (!a.length) return '—';
  return a
    .map(
      (x) =>
        `${DOC_TIPO_LABEL[x.documento_tipo] || x.documento_tipo}: ${x.nome_original}`
    )
    .join('; ');
}

/**
 * Lista detalhada de aquisições de consumíveis num período (data de aquisição).
 * @param {object} data — resultado de `exportPayloadRegistosPeriodo`
 */
export async function exportarListaConsumiveisPeriodo(data, formato) {
  const titulo = 'Consumíveis adquiridos — detalhe por período';
  const sub = `Aquisição entre ${data.filtros.de} e ${data.filtros.ate}  ·  ${IMPERIAL_BRAND.website}`;
  const logoBuf = await fetchImperialLogoBuffer();
  const linhas = data.linhas || [];

  if (formato === 'xlsx' || formato === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.creator = IMPERIAL_BRAND.company;
    const ws = wb.addWorksheet('Detalhe', { views: [{ showGridLines: true }] });
    applyExcelHeader(ws, wb, logoBuf, titulo, sub, '');

    ws.addRow(['Total de linhas', n(data.totais?.num_registos)]);
    ws.addRow(['Soma preço total (MZN)', n(data.totais?.total_mzn)]);
    ws.lastRow.getCell(2).numFmt = '#,##0.00';
    ws.addRow([]);

    const head = [
      'Província',
      'Tipo',
      'Quantidade',
      'Preço unit. (MZN)',
      'Preço total (MZN)',
      'Data aquisição',
      'Data término',
      'Observações',
      'Anexos (resumo)',
    ];
    ws.addRow(head);
    ws.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    ws.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const L of linhas) {
      const row = ws.addRow([
        L.provincia,
        TIPO_LABEL[L.tipo] || L.tipo,
        n(L.quantidade),
        n(L.preco_unitario),
        n(L.preco_total),
        L.data_aquisicao,
        L.data_termino || '',
        L.observacoes || '',
        anexosResumo(L),
      ]);
      row.getCell(4).numFmt = '#,##0.####';
      row.getCell(5).numFmt = '#,##0.00';
    }
    ws.getColumn(1).width = 26;
    ws.getColumn(2).width = 22;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 14;
    ws.getColumn(7).width = 14;
    ws.getColumn(8).width = 36;
    ws.getColumn(9).width = 48;

    const wsA = wb.addWorksheet('Anexos');
    applyExcelHeader(wsA, wb, logoBuf, `${titulo} — anexos`, sub, '');
    wsA.addRow(['Registo ID', 'Província', 'Data aquisição', 'Tipo doc.', 'Nome ficheiro', 'MIME', 'Tamanho (bytes)']);
    wsA.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    wsA.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const L of linhas) {
      for (const ax of L.anexos || []) {
        wsA.addRow([
          L.id,
          L.provincia,
          L.data_aquisicao,
          DOC_TIPO_LABEL[ax.documento_tipo] || ax.documento_tipo,
          ax.nome_original,
          ax.mime_type,
          n(ax.tamanho_bytes),
        ]);
      }
    }
    wsA.getColumn(1).width = 38;
    wsA.getColumn(2).width = 22;
    wsA.getColumn(3).width = 14;
    wsA.getColumn(4).width = 18;
    wsA.getColumn(5).width = 40;
    wsA.getColumn(6).width = 28;
    wsA.getColumn(7).width = 16;

    const buffer = await wb.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: filenameListaConsumiveisPeriodo(data, 'xlsx'),
    };
  }

  if (formato === 'docx' || formato === 'word') {
    const tableRows = linhas.map((L) => [
      L.provincia,
      TIPO_LABEL[L.tipo] || L.tipo,
      fmtInt(L.quantidade),
      fmtMoney(L.preco_unitario),
      fmtMoney(L.preco_total),
      L.data_aquisicao,
      L.data_termino || '—',
      (L.observacoes || '').slice(0, 80),
      anexosResumo(L),
    ]);

    const buffer = await buildDocxBuffer([
      ...docxLogoParagraph(logoBuf),
      ...docxCoverBlock({ titulo, subtitulo: sub }),
      docxHeading('Resumo'),
      ...docxKeyValueTable([
        ['Linhas', fmtInt(data.totais?.num_registos)],
        ['Total (MZN)', fmtMoney(data.totais?.total_mzn)],
      ]),
      docxHeading('Detalhe de aquisições'),
      ...docxTable(
        [
          { header: 'Província', width: 12 },
          { header: 'Tipo', width: 11 },
          { header: 'Qtd', width: 7 },
          { header: 'Unit.', width: 9 },
          { header: 'Total', width: 9 },
          { header: 'Aquis.', width: 9 },
          { header: 'Término', width: 9 },
          { header: 'Obs.', width: 14 },
          { header: 'Anexos', width: 20 },
        ],
        tableRows,
        { maxRows: 200 }
      ),
    ]);
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: filenameListaConsumiveisPeriodo(data, 'docx'),
    };
  }

  const { doc: docPdf, done } = createPdfDocument({ margin: 40, landscape: true });
  docPdf.addPage();
  pdfDrawCoverHeader(docPdf, logoBuf, { titulo, subtitulo: sub });
  pdfKpiGrid(docPdf, [
    { label: 'Linhas', value: fmtInt(data.totais?.num_registos) },
    { label: 'Total (MZN)', value: fmtMoney(data.totais?.total_mzn) },
    { label: 'Período', value: `${data.filtros.de} — ${data.filtros.ate}` },
  ]);
  pdfSectionTitle(docPdf, 'Registos de aquisição');
  pdfDataTable(
    docPdf,
    [
      { header: 'Província', key: 'prov', width: 1.1 },
      { header: 'Tipo', key: 'tipo', width: 1 },
      { header: 'Qtd', key: 'qtd', width: 0.6 },
      { header: 'Unit.', key: 'unit', width: 0.8 },
      { header: 'Total', key: 'total', width: 0.9 },
      { header: 'Aquis.', key: 'aq', width: 0.8 },
      { header: 'Término', key: 'term', width: 0.8 },
      { header: 'Anexos', key: 'ax', width: 1.2 },
    ],
    linhas.map((L) => ({
      prov: L.provincia,
      tipo: (TIPO_LABEL[L.tipo] || L.tipo).slice(0, 14),
      qtd: fmtInt(L.quantidade),
      unit: fmtMoney(L.preco_unitario),
      total: fmtMoney(L.preco_total),
      aq: L.data_aquisicao,
      term: L.data_termino || '—',
      ax: anexosResumo(L).slice(0, 40),
    })),
    { fontSize: 7, maxRows: 350 }
  );

  const buffer = await pdfFinalize(docPdf, done, { emitidoEm: data.emitido_em });
  return {
    buffer,
    contentType: 'application/pdf',
    filename: filenameListaConsumiveisPeriodo(data, 'pdf'),
  };
}

const MAPA_COLS = [
  'Província',
  'Departamento',
  'Tipo consumível',
  'Quantidade',
  'Preço unit. (MZN)',
  'Preço total (MZN)',
  'Data aquisição',
  'Data término',
  'Responsável',
  'Observações',
  'Nº anexos',
];

function estiloCabecalhoTabela(row) {
  row.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 22;
}

function preencherFolhaMapa(ws, linhas, startRow = 7) {
  const hdr = ws.getRow(startRow);
  MAPA_COLS.forEach((c, i) => {
    hdr.getCell(i + 1).value = c;
  });
  estiloCabecalhoTabela(hdr);
  let r = startRow + 1;
  for (const L of linhas) {
    const row = ws.getRow(r);
    row.getCell(1).value = L.provincia;
    row.getCell(2).value = L.departamento || '—';
    row.getCell(3).value = TIPO_LABEL[L.tipo] || L.tipo;
    row.getCell(4).value = n(L.quantidade);
    row.getCell(5).value = n(L.preco_unitario);
    row.getCell(6).value = n(L.preco_total);
    row.getCell(7).value = L.data_aquisicao;
    row.getCell(8).value = L.data_termino || '';
    row.getCell(9).value = L.responsavel || '—';
    row.getCell(10).value = L.observacoes || '';
    row.getCell(11).value = (L.anexos || []).length;
    row.getCell(4).numFmt = '#,##0.##';
    row.getCell(5).numFmt = '#,##0.0000';
    row.getCell(6).numFmt = '#,##0.00';
    if (r % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: excelArgb(IMPERIAL_BRAND.tableStripeHex) },
        };
      });
    }
    r += 1;
  }
  ws.views = [{ state: 'frozen', ySplit: startRow }];
  ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: r - 1, column: MAPA_COLS.length } };
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach((c) => {
    ws.getColumn(c).width = c <= 3 ? 22 : c <= 6 ? 14 : 18;
  });
  return r;
}

function folhaAnexosPorTipo(wb, logoBuf, titulo, sub, tipoKey, tipoLabel, linhas) {
  const ws = wb.addWorksheet(tipoLabel.slice(0, 31));
  applyExcelHeader(ws, wb, logoBuf, `${titulo} — ${tipoLabel}`, sub, '', 8);
  const hdr = ws.addRow([
    'Província',
    'Tipo consumível',
    'Data aquisição',
    'Preço total (MZN)',
    'Nome do ficheiro',
    'Tamanho (KB)',
    'Data upload',
  ]);
  estiloCabecalhoTabela(hdr);
  for (const L of linhas) {
    for (const ax of (L.anexos || []).filter((a) => a.documento_tipo === tipoKey)) {
      const row = ws.addRow([
        L.provincia,
        TIPO_LABEL[L.tipo] || L.tipo,
        L.data_aquisicao,
        n(L.preco_total),
        ax.nome_original,
        Math.round(n(ax.tamanho_bytes) / 1024),
        ax.created_at ? new Date(ax.created_at).toLocaleString('pt-MZ') : '',
      ]);
      row.getCell(4).numFmt = '#,##0.00';
    }
  }
  ws.getColumn(5).width = 42;
}

/**
 * Mapa completo de consumíveis (Excel principal — layout Imperial).
 * @param {object} data — `exportPayloadMapaCompleto`
 */
export async function exportarMapaCompletoConsumiveis(data, formato) {
  const titulo = 'Mapa de consumíveis — Imperial Seguros';
  const sub = data.filtros?.descricao || 'Todos os registos';
  const logoBuf = await fetchImperialLogoBuffer();
  const linhas = data.linhas || [];

  if (formato === 'xlsx' || formato === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.creator = IMPERIAL_BRAND.company;
    wb.created = new Date();

    const ws = wb.addWorksheet('Mapa de consumíveis', {
      views: [{ showGridLines: true }],
      properties: { defaultRowHeight: 18 },
    });
    applyExcelHeader(ws, wb, logoBuf, titulo, sub, `Emitido: ${new Date(data.emitido_em).toLocaleString('pt-MZ')}`, 11);

    ws.getRow(6).getCell(1).value = 'Total de registos';
    ws.getRow(6).getCell(2).value = n(data.totais?.num_registos);
    ws.getRow(6).getCell(3).value = 'Gasto total (MZN)';
    ws.getRow(6).getCell(4).value = n(data.totais?.total_mzn);
    ws.getRow(6).getCell(4).numFmt = '#,##0.00';
    ws.getRow(6).font = { bold: true };

    preencherFolhaMapa(ws, linhas, 8);

    const tiposDoc = [
      ['cotacao', 'Cotações'],
      ['fatura', 'Faturas'],
      ['recibo', 'Recibos'],
      ['comprovativo_pagamento', 'Comprovativos'],
    ];
    for (const [key, label] of tiposDoc) {
      folhaAnexosPorTipo(wb, logoBuf, titulo, sub, key, label, linhas);
    }

    const wsR = wb.addWorksheet('Resumo por província');
    applyExcelHeader(wsR, wb, logoBuf, `${titulo} — resumo`, sub, '', 4);
    const hR = wsR.addRow(['Província', 'Registos', 'Total (MZN)']);
    estiloCabecalhoTabela(hR);
    const porProv = new Map();
    for (const L of linhas) {
      const k = L.provincia || '—';
      if (!porProv.has(k)) porProv.set(k, { n: 0, t: 0 });
      const p = porProv.get(k);
      p.n += 1;
      p.t += L.preco_total;
    }
    for (const [prov, v] of [...porProv.entries()].sort((a, b) => b[1].t - a[1].t)) {
      const row = wsR.addRow([prov, v.n, v.t]);
      row.getCell(3).numFmt = '#,##0.00';
    }

    const buffer = await wb.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'imperial-consumiveis-mapa-completo.xlsx',
    };
  }

  return exportarListaConsumiveisPeriodo(
    { ...data, filtros: { de: data.filtros?.de || '0000-01-01', ate: data.filtros?.ate || '9999-12-31' } },
    formato
  );
}
