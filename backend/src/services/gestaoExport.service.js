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

const TIPO_CONSUMIVEL_REL = {
  papel_a4: 'Papel A4 (caixas)',
  envelope: 'Envelopes',
  toner: 'Toner',
  agrafos: 'Agrafos',
};

const DOC_TIPO_REL = {
  cotacao: 'Cotação',
  fatura: 'Fatura',
  recibo: 'Recibo',
  comprovativo_pagamento: 'Comprovativo',
  outro: 'Outro',
};

const COLS_IMPRESSAO_UTILIZADOR = [
  'Utilizador',
  'Departamento',
  'Província',
  'Data/hora',
  'Impressora',
  'Documento',
  'Páginas',
  'Cópias',
  'Folhas',
  'Papel',
  'Duplex',
  'Grayscale',
  'Cliente',
  'Idioma',
  'Largura mm',
  'Altura mm',
];

function adicionarAbasUtilizadoresMensal(wb, data, logoBuf, titulo, periodoTxt, isDemo) {
  const utilizadores = data.utilizadores || [];
  if (!utilizadores.length) return;

  const wsR = wb.addWorksheet('Resumo utilizadores');
  applyExcelBrandedHeader(wsR, wb, logoBuf, `${titulo} — resumo por utilizador`, periodoTxt, isDemo, 10);
  const rsum = data.resumo_utilizadores_mes || {};
  wsR.addRow(['Utilizadores', n(rsum.num_utilizadores)]);
  wsR.addRow(['Total impressões (jobs)', n(rsum.total_impressoes)]);
  wsR.addRow(['Total folhas', n(rsum.total_folhas)]);
  wsR.addRow(['Custo estimado (MZN)', n(rsum.custo_estimado_mzn)]);
  wsR.lastRow.getCell(2).numFmt = '#,##0.00';
  wsR.addRow([]);
  wsR.addRow([
    'Utilizador',
    'Departamento',
    'Província',
    'Jobs',
    'Folhas',
    'Duplex (folhas)',
    'Grayscale (folhas)',
    'Cor (folhas)',
    'Custo est. (MZN)',
  ]);
  wsR.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
  wsR.lastRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
  };
  for (const u of utilizadores) {
    const e = u.estatisticas || {};
    const row = wsR.addRow([
      u.usuario,
      u.departamento || '—',
      u.provincia || '—',
      n(e.total_impressoes),
      n(e.total_folhas),
      n(e.impressoes_duplex_folhas),
      n(e.impressoes_grayscale_folhas),
      n(e.impressoes_coloridas_folhas),
      n(e.custo_estimado_mzn),
    ]);
    row.getCell(9).numFmt = '#,##0.00';
  }
  wsR.getColumn(1).width = 22;
  wsR.getColumn(6).width = 14;

  const wsD = wb.addWorksheet('Impressões por utilizador');
  applyExcelBrandedHeader(wsD, wb, logoBuf, `${titulo} — detalhe de cada impressão`, periodoTxt, isDemo, 16);
  wsD.addRow(COLS_IMPRESSAO_UTILIZADOR);
  wsD.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
  wsD.lastRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
  };
  for (const u of utilizadores) {
    for (const L of u.impressoes || []) {
      wsD.addRow([
        L.usuario || u.usuario,
        L.departamento || u.departamento,
        L.provincia || u.provincia,
        L.data_hora ? new Date(L.data_hora).toISOString() : '',
        L.impressora,
        L.documento,
        n(L.paginas),
        n(L.copias),
        n(L.folhas),
        L.papel,
        L.duplex ? 'Sim' : 'Não',
        L.grayscale ? 'Sim' : 'Não',
        L.cliente,
        L.idioma,
        L.largura_mm,
        L.altura_mm,
      ]);
    }
  }
  wsD.getColumn(6).width = 40;
  wsD.getColumn(4).width = 22;
}

function buildFilename(periodo, formato, isDemo) {
  const y = periodo.ano;
  const m = String(periodo.mes).padStart(2, '0');
  const base = isDemo ? `imperial-papercut-demo-${y}-${m}` : `imperial-papercut-${y}-${m}`;
  if (formato === 'xlsx' || formato === 'excel') return `${base}.xlsx`;
  if (formato === 'docx' || formato === 'word') return `${base}.docx`;
  return `${base}.pdf`;
}

function applyExcelBrandedHeader(ws, wb, logoBuf, tituloRelatorio, periodoTxt, isDemo, colSpan = 8) {
  ws.mergeCells(1, 1, 1, colSpan);
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

  ws.mergeCells(2, 1, 2, colSpan);
  ws.getRow(2).getCell(1).value = tituloRelatorio;
  ws.getRow(2).getCell(1).font = { bold: true, size: 12, color: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) } };
  ws.getRow(2).getCell(1).alignment = { horizontal: 'center' };

  const linha3 = `Período: ${periodoTxt}  ·  ${IMPERIAL_BRAND.website}${isDemo ? '  ·  DEMONSTRAÇÃO (dados fictícios)' : ''}`;
  ws.mergeCells(3, 1, 3, colSpan);
  ws.getRow(3).getCell(1).value = linha3;
  ws.getRow(3).getCell(1).font = { size: 10, color: { argb: excelArgb(IMPERIAL_BRAND.mutedTextHex) } };
  ws.getRow(3).getCell(1).alignment = { horizontal: 'center' };

  ws.addRow([]);
  const bar = ws.addRow([]);
  ws.mergeCells(5, 1, 5, colSpan);
  bar.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelArgb(IMPERIAL_BRAND.secondaryHex) },
  };
  bar.height = 6;
}

/**
 * Exporta relatório PaperCut mensal (PDF, Excel ou Word).
 * @param {object} data — resultado de `relatorioMensalPapercut` ou `obterDadosRelatorioDemo`
 * @param {string} formato — pdf | xlsx | excel | docx | word
 * @param {{ isDemo?: boolean }} [options]
 */
export async function exportarRelatorioMensal(data, formato, options = {}) {
  const isDemo = Boolean(options.isDemo || data.demo);
  const titulo = `Relatório PaperCut — ${data.periodo.ano}-${String(data.periodo.mes).padStart(2, '0')}`;
  const periodoTxt = `${String(data.periodo.mes).padStart(2, '0')}/${data.periodo.ano}`;
  const porDept = data.por_departamento || [];
  const porProv = data.por_provincia || [];
  const topUsers = data.top_usuarios || [];
  const topPrinters = data.top_impressoras || [];
  const logoBuf = await fetchImperialLogoBuffer();

  if (formato === 'xlsx' || formato === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.creator = IMPERIAL_BRAND.company;
    wb.created = new Date();

    const ws = wb.addWorksheet('Resumo', { views: [{ showGridLines: true }] });
    applyExcelBrandedHeader(ws, wb, logoBuf, titulo, periodoTxt, isDemo);

    ws.addRow(['Indicador', 'Valor']);
    const hdrKpi = ws.lastRow;
    hdrKpi.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    hdrKpi.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    const fin = data.financeiro || {};
    const kpiRows = [
      ['Folhas impressas', n(data.totais?.folhas)],
      ['Resmas A4 (est.)', n(data.totais?.resmas ?? data.estimativas?.resmas_a4)],
      ['Caixas A4 (est.)', n(data.totais?.caixas ?? data.estimativas?.caixas_a4)],
      ['Jobs', n(data.totais?.jobs)],
      ['Duplex (folhas)', n(data.totais?.folhas_duplex)],
      ['Grayscale (folhas)', n(data.totais?.folhas_gray)],
      ['Cor / não-grayscale (folhas)', n(data.totais?.folhas_cor_ou_nao_gray)],
      ['Toner (índice relativo)', n(data.estimativas?.toner_relativo)],
      ['Preço por folha (MZN)', n(fin.preco_por_folha_mzn ?? data.precos_referencia?.preco_por_folha_mzn)],
      ['Custo papel (MZN)', n(fin.gasto_papel_mzn ?? data.estimativas?.gasto_papel_mzn)],
      ['Custo toner (MZN)', n(fin.gasto_toner_mzn ?? data.estimativas?.gasto_toner_estimado_mzn)],
      ['Custo total impressão (MZN)', n(fin.custo_total_mzn ?? data.estimativas?.custo_total_estimado_mzn)],
      ['Aquisições consumíveis no mês (MZN)', n(fin.gasto_aquisicoes_consumiveis_mes ?? data.resumo_consumiveis_mes?.total_mzn)],
      ['Média custo mensal 6 meses (MZN)', n(fin.media_custo_mensal_mzn)],
      ['Tendência custo vs mês ant. (%)', n(fin.tendencia_custo_mensal_pct)],
    ];
    for (const [a, b] of kpiRows) {
      const row = ws.addRow([a, b]);
      const c2 = row.getCell(2);
      c2.numFmt = String(a).includes('MZN')
        ? '#,##0.00'
        : String(a).includes('Caixas') || String(a).includes('Toner')
          ? '#,##0.##'
          : '#,##0';
      row.eachCell((cell, col) => {
        if (col === 1)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelArgb(IMPERIAL_BRAND.tableStripeHex) } };
      });
    }
    ws.getColumn(1).width = 38;
    ws.getColumn(2).width = 22;

    const wsProv = wb.addWorksheet('Por província');
    applyExcelBrandedHeader(wsProv, wb, logoBuf, `${titulo} — custos por província`, periodoTxt, isDemo);
    wsProv.addRow(['Província', 'Folhas', 'Resmas', 'Caixas', 'Custo papel (MZN)', 'Custo toner (MZN)', 'Custo total (MZN)']);
    const hdrProv = wsProv.lastRow;
    hdrProv.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    hdrProv.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const row of porProv) {
      const r = wsProv.addRow([
        row.provincia,
        n(row.folhas),
        n(row.resmas),
        n(row.caixas),
        n(row.gasto_papel_mzn),
        n(row.gasto_toner_mzn),
        n(row.custo_total_mzn),
      ]);
      [5, 6, 7].forEach((c) => {
        r.getCell(c).numFmt = '#,##0.00';
      });
    }
    wsProv.getColumn(1).width = 28;
    wsProv.getColumn(2).width = 12;
    const lastProv = wsProv.rowCount;
    if (lastProv >= 7) {
      wsProv.addConditionalFormatting({
        ref: `B7:B${lastProv}`,
        rules: [
          {
            type: 'dataBar',
            cfvo: [{ type: 'min' }, { type: 'max' }],
            color: { argb: excelArgb(IMPERIAL_BRAND.chartBarHex) },
          },
        ],
      });
    }

    const wsDept = wb.addWorksheet('Por departamento');
    applyExcelBrandedHeader(wsDept, wb, logoBuf, `${titulo} — custos por departamento`, periodoTxt, isDemo);
    wsDept.addRow(['Departamento', 'Folhas', 'Resmas', 'Caixas', 'Custo papel (MZN)', 'Custo toner (MZN)', 'Custo total (MZN)']);
    const hdrDept = wsDept.lastRow;
    hdrDept.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    hdrDept.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const row of porDept) {
      const r = wsDept.addRow([
        row.departamento,
        n(row.folhas),
        n(row.resmas),
        n(row.caixas),
        n(row.gasto_papel_mzn),
        n(row.gasto_toner_mzn),
        n(row.custo_total_mzn),
      ]);
      [5, 6, 7].forEach((c) => {
        r.getCell(c).numFmt = '#,##0.00';
      });
    }
    wsDept.getColumn(1).width = 36;
    wsDept.getColumn(2).width = 12;
    const lastDept = wsDept.rowCount;
    if (lastDept >= 7) {
      wsDept.addConditionalFormatting({
        ref: `B7:B${lastDept}`,
        rules: [
          {
            type: 'dataBar',
            cfvo: [{ type: 'min' }, { type: 'max' }],
            color: { argb: excelArgb(IMPERIAL_BRAND.chartBarHex) },
          },
        ],
      });
    }

    const wsU = wb.addWorksheet('Top utilizadores');
    applyExcelBrandedHeader(wsU, wb, logoBuf, `${titulo} — utilizadores`, periodoTxt, isDemo);
    wsU.addRow(['Utilizador', 'Folhas', 'Custo total (MZN)']);
    wsU.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    wsU.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const u of topUsers) {
      const r = wsU.addRow([u.usuario_papercut, n(u.folhas), n(u.custo_total_mzn)]);
      r.getCell(3).numFmt = '#,##0.00';
    }
    wsU.getColumn(1).width = 28;
    wsU.getColumn(2).width = 14;
    const lastU = wsU.rowCount;
    if (lastU >= 7) {
      wsU.addConditionalFormatting({
        ref: `B7:B${lastU}`,
        rules: [
          {
            type: 'dataBar',
            cfvo: [{ type: 'min' }, { type: 'max' }],
            color: { argb: excelArgb(IMPERIAL_BRAND.chartBarHex) },
          },
        ],
      });
    }

    const wsP = wb.addWorksheet('Top impressoras');
    applyExcelBrandedHeader(wsP, wb, logoBuf, `${titulo} — equipamentos`, periodoTxt, isDemo);
    wsP.addRow(['Impressora', 'Folhas']);
    wsP.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    wsP.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const p of topPrinters) {
      wsP.addRow([p.impressora, n(p.folhas)]);
    }
    wsP.getColumn(1).width = 52;
    wsP.getColumn(2).width = 14;
    const lastP = wsP.rowCount;
    if (lastP >= 7) {
      wsP.addConditionalFormatting({
        ref: `B7:B${lastP}`,
        rules: [
          {
            type: 'dataBar',
            cfvo: [{ type: 'min' }, { type: 'max' }],
            color: { argb: excelArgb(IMPERIAL_BRAND.chartBarHex) },
          },
        ],
      });
    }

    const cons = data.consumiveis_aquisicao_no_mes || [];
    const wsCons = wb.addWorksheet('Consumíveis (mês)');
    applyExcelBrandedHeader(
      wsCons,
      wb,
      logoBuf,
      `${titulo} — aquisições de consumíveis no mês`,
      `Datas de aquisição em ${periodoTxt} (calendário)`,
      isDemo,
      12
    );
    const rsum = data.resumo_consumiveis_mes || { num_registos: 0, total_mzn: 0 };
    wsCons.addRow(['Nº registos (linhas)', n(rsum.num_registos)]);
    wsCons.addRow(['Total gasto (MZN)', n(rsum.total_mzn)]);
    wsCons.lastRow.getCell(2).numFmt = '#,##0.00';
    wsCons.addRow([]);
    wsCons.addRow([
      'Província',
      'Tipo',
      'Quantidade',
      'Preço unit. (MZN)',
      'Preço total (MZN)',
      'Data aquisição',
      'Data término',
      'Observações',
      'Anexos (resumo)',
    ]);
    wsCons.lastRow.font = { bold: true, color: { argb: excelArgb(IMPERIAL_BRAND.textOnPrimaryHex) } };
    wsCons.lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelArgb(IMPERIAL_BRAND.primaryHex) },
    };
    for (const L of cons) {
      const axTxt =
        (L.anexos || [])
          .map((a) => `${DOC_TIPO_REL[a.documento_tipo] || a.documento_tipo}: ${a.nome_original}`)
          .join('; ') || '—';
      const row = wsCons.addRow([
        L.provincia,
        TIPO_CONSUMIVEL_REL[L.tipo] || L.tipo,
        n(L.quantidade),
        n(L.preco_unitario),
        n(L.preco_total),
        L.data_aquisicao,
        L.data_termino || '',
        L.observacoes || '',
        axTxt,
      ]);
      row.getCell(4).numFmt = '#,##0.####';
      row.getCell(5).numFmt = '#,##0.00';
    }
    wsCons.getColumn(1).width = 24;
    wsCons.getColumn(2).width = 22;
    wsCons.getColumn(3).width = 12;
    wsCons.getColumn(4).width = 16;
    wsCons.getColumn(5).width = 16;
    wsCons.getColumn(6).width = 14;
    wsCons.getColumn(7).width = 14;
    wsCons.getColumn(8).width = 28;
    wsCons.getColumn(9).width = 44;

    adicionarAbasUtilizadoresMensal(wb, data, logoBuf, titulo, periodoTxt, isDemo);

    const buffer = await wb.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: buildFilename(data.periodo, 'xlsx', isDemo),
    };
  }

  if (formato === 'docx' || formato === 'word') {
    const fin = data.financeiro || {};
    const rsumU = data.resumo_utilizadores_mes || {};
    const rsumC = data.resumo_consumiveis_mes || { num_registos: 0, total_mzn: 0 };
    const fonte =
      data.precos_referencia?.fonte === 'consumiveis' ? 'Preços reais (consumíveis)' : 'Referência padrão';

    const children = [
      ...docxLogoParagraph(logoBuf),
      ...docxCoverBlock({
        titulo,
        subtitulo: `Período: ${periodoTxt}`,
        badge: isDemo ? 'DEMONSTRAÇÃO' : '',
      }),
      docxHeading('Resumo executivo'),
      ...docxKeyValueTable([
        ['Folhas impressas', fmtInt(data.totais?.folhas)],
        ['Resmas A4 (est.)', String(data.totais?.resmas ?? data.estimativas?.resmas_a4 ?? '—')],
        ['Caixas A4 (est.)', String(data.totais?.caixas ?? data.estimativas?.caixas_a4 ?? '—')],
        ['Jobs', fmtInt(data.totais?.jobs)],
        ['Custo papel (MZN)', fmtMoney(fin.gasto_papel_mzn ?? data.estimativas?.gasto_papel_mzn)],
        ['Custo toner (MZN)', fmtMoney(fin.gasto_toner_mzn ?? data.estimativas?.gasto_toner_estimado_mzn)],
        ['Custo total impressão (MZN)', fmtMoney(fin.custo_total_mzn ?? data.estimativas?.custo_total_estimado_mzn)],
        ['Aquisições consumíveis (MZN)', fmtMoney(fin.gasto_aquisicoes_consumiveis_mes ?? rsumC.total_mzn)],
        ['Fonte de preços', fonte],
        ['Preço por folha (MZN)', String(fin.preco_por_folha_mzn ?? data.precos_referencia?.preco_por_folha_mzn ?? '—')],
      ]),
      docxHeading('Custos por província'),
      ...docxTable(
        [
          { header: 'Província', width: 18 },
          { header: 'Folhas', width: 10 },
          { header: 'Resmas', width: 9 },
          { header: 'Custo papel', width: 12 },
          { header: 'Custo toner', width: 12 },
          { header: 'Total', width: 12 },
        ],
        porProv.map((r) => [
          r.provincia,
          fmtInt(r.folhas),
          fmtInt(r.resmas),
          fmtMoney(r.gasto_papel_mzn),
          fmtMoney(r.gasto_toner_mzn),
          fmtMoney(r.custo_total_mzn),
        ])
      ),
      docxHeading('Custos por departamento'),
      ...docxTable(
        [
          { header: 'Departamento', width: 22 },
          { header: 'Folhas', width: 10 },
          { header: 'Caixas est.', width: 10 },
          { header: 'Custo total (MZN)', width: 14 },
        ],
        porDept.map((r) => [r.departamento, fmtInt(r.folhas), fmtInt(r.caixas), fmtMoney(r.custo_total_mzn)])
      ),
      docxHeading('Top utilizadores (volume e custo)'),
      ...docxTable(
        [
          { header: 'Utilizador', width: 22 },
          { header: 'Folhas', width: 12 },
          { header: 'Custo (MZN)', width: 14 },
        ],
        topUsers.map((u) => [u.usuario_papercut, fmtInt(u.folhas), fmtMoney(u.custo_total_mzn)])
      ),
      docxHeading('Impressões por utilizador'),
      ...docxKeyValueTable([
        ['Utilizadores', fmtInt(rsumU.num_utilizadores)],
        ['Total jobs', fmtInt(rsumU.total_impressoes)],
        ['Total folhas', fmtInt(rsumU.total_folhas)],
        ['Custo estimado (MZN)', fmtMoney(rsumU.custo_estimado_mzn)],
      ]),
      ...docxTable(
        [
          { header: 'Utilizador', width: 16 },
          { header: 'Dept.', width: 14 },
          { header: 'Folhas', width: 10 },
          { header: 'Jobs', width: 8 },
          { header: 'Custo (MZN)', width: 12 },
        ],
        (data.utilizadores || []).slice(0, 80).map((u) => {
          const e = u.estatisticas || {};
          return [u.usuario, u.departamento || '—', fmtInt(e.total_folhas), fmtInt(e.total_impressoes), fmtMoney(e.custo_estimado_mzn)];
        }),
        { maxRows: 80 }
      ),
      docxHeading('Consumíveis adquiridos no mês'),
      ...docxKeyValueTable([
        ['Registos', fmtInt(rsumC.num_registos)],
        ['Total (MZN)', fmtMoney(rsumC.total_mzn)],
      ]),
      ...docxTable(
        [
          { header: 'Província', width: 14 },
          { header: 'Tipo', width: 14 },
          { header: 'Qtd', width: 8 },
          { header: 'Total', width: 10 },
          { header: 'Data', width: 10 },
        ],
        (data.consumiveis_aquisicao_no_mes || []).map((L) => [
          L.provincia,
          TIPO_CONSUMIVEL_REL[L.tipo] || L.tipo,
          fmtInt(L.quantidade),
          fmtMoney(L.preco_total),
          L.data_aquisicao,
        ]),
        { maxRows: 100 }
      ),
    ];

    const buffer = await buildDocxBuffer(children);
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: buildFilename(data.periodo, 'docx', isDemo),
    };
  }

  const { doc: docPdf, done } = createPdfDocument({ margin: 44 });
  const fin = data.financeiro || {};

  docPdf.addPage();
  pdfDrawCoverHeader(docPdf, logoBuf, {
    titulo,
    subtitulo: `Período: ${periodoTxt}`,
    isDemo,
  });

  pdfSectionTitle(docPdf, 'Resumo executivo', 'Volumes PaperCut e custos com preços dos consumíveis');
  pdfKpiGrid(docPdf, [
    { label: 'Folhas impressas', value: fmtInt(data.totais?.folhas) },
    { label: 'Resmas / caixas A4', value: `${data.totais?.resmas ?? '—'} / ${data.totais?.caixas ?? '—'}` },
    { label: 'Custo total (MZN)', value: fmtMoney(fin.custo_total_mzn ?? data.estimativas?.custo_total_estimado_mzn) },
    { label: 'Custo papel (MZN)', value: fmtMoney(fin.gasto_papel_mzn ?? data.estimativas?.gasto_papel_mzn) },
    { label: 'Custo toner (MZN)', value: fmtMoney(fin.gasto_toner_mzn ?? data.estimativas?.gasto_toner_estimado_mzn) },
    { label: 'Aquisições consumíveis', value: fmtMoney(fin.gasto_aquisicoes_consumiveis_mes ?? data.resumo_consumiveis_mes?.total_mzn) },
  ]);

  pdfHorizontalBarChart(docPdf, 'Comparativo — custo por província (MZN)', porProv, (r) => r.provincia, (r) => r.custo_total_mzn, fmtMoney);
  pdfDataTable(
    docPdf,
    [
      { header: 'Província', key: 'p', width: 1.2 },
      { header: 'Folhas', key: 'f', width: 0.8 },
      { header: '$ Papel', key: 'cp', width: 1 },
      { header: '$ Toner', key: 'ct', width: 1 },
      { header: 'Total', key: 't', width: 1 },
    ],
    porProv.map((r) => ({
      p: r.provincia,
      f: fmtInt(r.folhas),
      cp: fmtMoney(r.gasto_papel_mzn),
      ct: fmtMoney(r.gasto_toner_mzn),
      t: fmtMoney(r.custo_total_mzn),
    })),
    { fontSize: 8 }
  );

  pdfSectionTitle(docPdf, 'Custos por departamento');
  pdfDataTable(
    docPdf,
    [
      { header: 'Departamento', key: 'd', width: 1.5 },
      { header: 'Folhas', key: 'f', width: 0.8 },
      { header: 'Caixas', key: 'c', width: 0.7 },
      { header: 'Total MZN', key: 't', width: 1 },
    ],
    porDept.map((r) => ({
      d: (r.departamento || '—').slice(0, 28),
      f: fmtInt(r.folhas),
      c: fmtInt(r.caixas),
      t: fmtMoney(r.custo_total_mzn),
    }))
  );

  pdfSectionTitle(docPdf, 'Utilizadores — resumo e custos');
  const rsumUPdf = data.resumo_utilizadores_mes || {};
  pdfKpiGrid(docPdf, [
    { label: 'Utilizadores', value: fmtInt(rsumUPdf.num_utilizadores) },
    { label: 'Jobs', value: fmtInt(rsumUPdf.total_impressoes) },
    { label: 'Custo total (MZN)', value: fmtMoney(rsumUPdf.custo_estimado_mzn) },
  ]);
  pdfDataTable(
    docPdf,
    [
      { header: 'Utilizador', key: 'u', width: 1.2 },
      { header: 'Folhas', key: 'f', width: 0.7 },
      { header: 'Jobs', key: 'j', width: 0.6 },
      { header: 'Custo MZN', key: 'c', width: 0.9 },
    ],
    (data.utilizadores || []).slice(0, 50).map((u) => {
      const e = u.estatisticas || {};
      return {
        u: u.usuario,
        f: fmtInt(e.total_folhas),
        j: fmtInt(e.total_impressoes),
        c: fmtMoney(e.custo_estimado_mzn),
      };
    }),
    { fontSize: 7.5, maxRows: 50 }
  );

  const consPdf = data.consumiveis_aquisicao_no_mes || [];
  if (consPdf.length) {
    pdfSectionTitle(docPdf, 'Consumíveis adquiridos no mês');
    pdfDataTable(
      docPdf,
      [
        { header: 'Província', key: 'p', width: 1 },
        { header: 'Tipo', key: 't', width: 1 },
        { header: 'Qtd', key: 'q', width: 0.6 },
        { header: 'Total', key: 'tot', width: 0.9 },
        { header: 'Data', key: 'd', width: 0.8 },
      ],
      consPdf.map((L) => ({
        p: L.provincia,
        t: (TIPO_CONSUMIVEL_REL[L.tipo] || L.tipo).slice(0, 14),
        q: fmtInt(L.quantidade),
        tot: fmtMoney(L.preco_total),
        d: L.data_aquisicao,
      })),
      { fontSize: 7.5, maxRows: 80 }
    );
  }

  const buffer = await pdfFinalize(docPdf, done);
  return {
    buffer,
    contentType: 'application/pdf',
    filename: buildFilename(data.periodo, 'pdf', isDemo),
  };
}
