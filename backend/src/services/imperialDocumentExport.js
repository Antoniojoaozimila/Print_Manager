/**
 * Layout moderno Imperial — PDF (PDFKit) e Word (docx) reutilizável.
 */
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  HeadingLevel,
} from 'docx';
import { IMPERIAL_BRAND, imageExtensionForWorkbook } from './imperialBrand.js';

export function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function fmtInt(v) {
  return new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 0 }).format(Math.round(n(v)));
}

export function fmtMoney(v) {
  return new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n(v));
}

function hexRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return { r: 27, g: 94, b: 32 };
}

function docxColor(hex) {
  return String(hex || '').replace('#', '');
}

// ——— PDF ———

export function createPdfDocument({ landscape = false, margin = 44 } = {}) {
  const doc = new PDFDocument({
    margin,
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
    autoFirstPage: false,
    bufferPages: true,
  });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

export function pdfNewPageIfNeeded(doc, minSpace = 90) {
  if (doc.y + minSpace > doc.page.height - doc.page.margins.bottom - 36) {
    doc.addPage();
    doc.y = doc.page.margins.top;
    return true;
  }
  return false;
}

/** Cabeçalho corporativo com faixa verde e logótipo. */
export function pdfDrawCoverHeader(doc, logoBuf, { titulo, subtitulo, extra = '', isDemo = false } = {}) {
  const headerH = 88;
  const w = doc.page.width;
  doc.save();
  doc.rect(0, 0, w, headerH).fill(IMPERIAL_BRAND.headerBandHex);
  doc.restore();

  let textLeft = doc.page.margins.left;
  if (logoBuf) {
    try {
      doc.image(logoBuf, doc.page.margins.left, 14, { height: 56 });
      textLeft = doc.page.margins.left + 120;
    } catch {
      /* ignorar */
    }
  }

  doc.fillColor(IMPERIAL_BRAND.textOnPrimaryHex).fontSize(12).text(IMPERIAL_BRAND.company, textLeft, 18, {
    width: w - textLeft - doc.page.margins.right,
  });
  doc.fontSize(10).fillColor(IMPERIAL_BRAND.secondaryHex).text(titulo || '', textLeft, 38, {
    width: w - textLeft - doc.page.margins.right,
  });
  const meta = [subtitulo, IMPERIAL_BRAND.website, extra].filter(Boolean).join('  ·  ');
  doc.fontSize(8).fillColor('#cfd8dc').text(meta, textLeft, 56, { width: w - textLeft - doc.page.margins.right });
  if (isDemo) {
    doc.fontSize(8).fillColor('#ffecb3').text('DEMONSTRAÇÃO — dados fictícios', textLeft, 72);
  }
  doc
    .moveTo(0, headerH)
    .lineTo(w, headerH)
    .strokeColor(IMPERIAL_BRAND.primaryHex)
    .lineWidth(3)
    .stroke();
  doc.fillColor(IMPERIAL_BRAND.bodyTextHex);
  doc.y = headerH + 20;
}

export function pdfSectionTitle(doc, title, subtitle) {
  pdfNewPageIfNeeded(doc, 56);
  doc.fontSize(12).fillColor(IMPERIAL_BRAND.primaryHex).text(title, { underline: true });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(8.5).fillColor(IMPERIAL_BRAND.mutedTextHex).text(subtitle);
  }
  doc.moveDown(0.45);
}

/** Grelha de KPIs (2 colunas). */
export function pdfKpiGrid(doc, items) {
  const left = doc.page.margins.left;
  const w = doc.page.width - left - doc.page.margins.right;
  const colW = w / 2 - 10;
  const rowH = 38;
  let startY = doc.y;

  for (let i = 0; i < items.length; i++) {
    const { label, value } = items[i];
    if (i > 0 && i % 2 === 0) startY += rowH;
    pdfNewPageIfNeeded(doc, rowH + 4);
    if (i % 2 === 0 && i > 0) startY = doc.y;

    const x = left + (i % 2) * (colW + 12);
    const y = startY;

    doc.save();
    doc.rect(x, y, colW, rowH - 4).fill(IMPERIAL_BRAND.tableStripeHex);
    doc.restore();
    doc.fontSize(7.5).fillColor(IMPERIAL_BRAND.mutedTextHex).text(label, x + 8, y + 6, { width: colW - 14 });
    doc.fontSize(11).fillColor(IMPERIAL_BRAND.primaryHex).text(String(value), x + 8, y + 19, { width: colW - 14 });
  }
  const rows = Math.ceil(items.length / 2);
  doc.y = startY + rows * rowH + 8;
}

/** Tabela PDF com cabeçalho verde. */
export function pdfDataTable(doc, columns, rows, { fontSize = 8, maxRows = 500 } = {}) {
  if (!columns?.length) return;
  const left = doc.page.margins.left;
  const tableW = doc.page.width - left - doc.page.margins.right;
  const colWidths = columns.map((c) => (c.width || 1) / columns.reduce((s, x) => s + (x.width || 1), 0));
  const widths = colWidths.map((f) => f * tableW);
  const headerH = 22;
  const rowH = Math.max(16, fontSize + 8);

  const drawHeader = () => {
    let x = left;
    doc.save();
    doc.rect(left, doc.y, tableW, headerH).fill(IMPERIAL_BRAND.primaryHex);
    doc.restore();
    doc.fontSize(fontSize).fillColor(IMPERIAL_BRAND.textOnPrimaryHex);
    columns.forEach((col, i) => {
      doc.text(String(col.header), x + 4, doc.y + 6, { width: widths[i] - 8, lineBreak: false });
      x += widths[i];
    });
    doc.y += headerH;
  };

  drawHeader();
  let stripe = false;
  const slice = rows.slice(0, maxRows);

  for (const row of slice) {
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      drawHeader();
    }
    let x = left;
    if (stripe) {
      doc.save();
      doc.rect(left, doc.y, tableW, rowH).fill(IMPERIAL_BRAND.tableStripeHex);
      doc.restore();
    }
    doc.fontSize(fontSize).fillColor(IMPERIAL_BRAND.bodyTextHex);
    columns.forEach((col, i) => {
      const val = col.format ? col.format(row) : String(row[col.key] ?? '—');
      const txt = val.length > 80 ? `${val.slice(0, 78)}…` : val;
      doc.text(txt, x + 4, doc.y + 4, { width: widths[i] - 8, lineBreak: false });
      x += widths[i];
    });
    doc.y += rowH;
    stripe = !stripe;
  }

  if (rows.length > maxRows) {
    doc.fontSize(8).fillColor(IMPERIAL_BRAND.mutedTextHex).text(`… mais ${rows.length - maxRows} linhas (consulte Excel).`);
  }
  doc.moveDown(0.4);
}

export function pdfHorizontalBarChart(doc, title, rows, labelFn, valueFn, formatFn = fmtInt, maxRows = 14) {
  const slice = (rows || []).slice(0, maxRows).filter(Boolean);
  if (!slice.length) return;

  pdfSectionTitle(doc, title);
  const leftM = doc.page.margins.left;
  const usableW = doc.page.width - leftM - doc.page.margins.right;
  const labelW = Math.min(180, usableW * 0.42);
  const barAreaW = usableW - labelW - 58;
  const maxV = Math.max(...slice.map((r) => n(valueFn(r))), 1);

  let y = doc.y;
  for (const row of slice) {
    if (y + 24 > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    const lab = String(labelFn(row) || '—');
    const val = n(valueFn(row));
    const barW = Math.max(3, (val / maxV) * barAreaW);
    doc.fillColor(IMPERIAL_BRAND.bodyTextHex).fontSize(8.5);
    doc.text(lab.length > 48 ? `${lab.slice(0, 46)}…` : lab, leftM, y + 4, { width: labelW - 4 });
    doc.rect(leftM + labelW, y, barAreaW, 16).fill(IMPERIAL_BRAND.accentHex);
    doc.rect(leftM + labelW, y, barW, 16).fill(IMPERIAL_BRAND.chartBarHex);
    doc.fontSize(9).fillColor(IMPERIAL_BRAND.bodyTextHex);
    doc.text(formatFn(val), leftM + labelW + barAreaW + 6, y + 3, { width: 50, align: 'right' });
    y += 22;
  }
  doc.y = y + 8;
}

export function pdfFinalize(doc, done, { emitidoEm } = {}) {
  const range = doc.bufferedPageRange();
  const emitTxt = emitidoEm
    ? new Date(emitidoEm).toLocaleString('pt-MZ')
    : new Date().toLocaleString('pt-MZ');

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const footerY = doc.page.height - doc.page.margins.bottom + 8;
    doc.fontSize(7.5).fillColor(IMPERIAL_BRAND.mutedTextHex);
    doc.text(
      `${IMPERIAL_BRAND.company}  ·  ${IMPERIAL_BRAND.website}  ·  Emitido: ${emitTxt}  ·  Página ${i - range.start + 1} de ${range.count}`,
      doc.page.margins.left,
      footerY,
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center' }
    );
  }
  doc.end();
  return done;
}

// ——— Word ———

export function docxLogoParagraph(logoBuf) {
  if (!logoBuf) return [];
  try {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            data: logoBuf,
            transformation: { width: 200, height: 68 },
            type: imageExtensionForWorkbook(logoBuf) === 'jpeg' ? 'jpg' : 'png',
          }),
        ],
      }),
    ];
  } catch {
    return [];
  }
}

export function docxCoverBlock({ titulo, subtitulo, badge = '' }) {
  const primary = docxColor(IMPERIAL_BRAND.primaryHex);
  const muted = docxColor(IMPERIAL_BRAND.mutedTextHex);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: IMPERIAL_BRAND.company, bold: true, size: 32, color: primary })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: IMPERIAL_BRAND.subtitle, size: 20, color: muted })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: titulo, bold: true, size: 28, color: primary })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: badge ? 60 : 200 },
      children: [
        new TextRun({
          text: [subtitulo, IMPERIAL_BRAND.website, badge].filter(Boolean).join('  ·  '),
          italics: true,
          size: 18,
          color: muted,
        }),
      ],
    }),
    ...(badge
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: badge, bold: true, size: 18, color: 'B8860B' })],
          }),
        ]
      : []),
  ];
}

export function docxHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: docxColor(IMPERIAL_BRAND.primaryHex),
        size: level === HeadingLevel.HEADING_1 ? 26 : 22,
      }),
    ],
  });
}

export function docxSpacer() {
  return new Paragraph({ text: '', spacing: { after: 120 } });
}

export function docxParagraph(text, { bold = false, muted = false, size = 22 } = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        bold,
        size,
        color: muted ? docxColor(IMPERIAL_BRAND.mutedTextHex) : docxColor(IMPERIAL_BRAND.bodyTextHex),
      }),
    ],
  });
}

const border = { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' };
const borders = { top: border, bottom: border, left: border, right: border };

function docxHeaderCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { fill: docxColor(IMPERIAL_BRAND.primaryHex), type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: docxColor(IMPERIAL_BRAND.textOnPrimaryHex), size: 18 })],
      }),
    ],
  });
}

function docxBodyCell(text, widthPct, stripe) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: stripe ? { fill: docxColor(IMPERIAL_BRAND.tableStripeHex), type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    borders,
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text ?? '—'), size: 18, color: docxColor(IMPERIAL_BRAND.bodyTextHex) })],
      }),
    ],
  });
}

/** Tabela Word com cabeçalho Imperial. columns: [{ header, width }] rows: array of arrays */
export function docxTable(columns, rows, { maxRows = 300 } = {}) {
  if (!columns?.length) return docxSpacer();
  const w = 100 / columns.length;
  const widths = columns.map((c) => c.width || w);
  const totalW = widths.reduce((a, b) => a + b, 0);
  const norm = widths.map((x) => (x / totalW) * 100);

  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map((c, i) => docxHeaderCell(c.header, norm[i])),
  });

  const bodyRows = rows.slice(0, maxRows).map((row, ri) => {
    const cells = Array.isArray(row)
      ? row.map((cell, i) => docxBodyCell(cell, norm[i], ri % 2 === 1))
      : columns.map((c, i) => docxBodyCell(row[c.key], norm[i], ri % 2 === 1));
    return new TableRow({ children: cells });
  });

  const children = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...bodyRows],
    }),
  ];

  if (rows.length > maxRows) {
    children.push(
      docxParagraph(`… e mais ${rows.length - maxRows} linhas (consulte o ficheiro Excel).`, { muted: true, size: 18 })
    );
  }
  children.push(docxSpacer());
  return children;
}

export function docxKeyValueTable(pairs) {
  const rows = pairs.map(([k, v]) => [k, v]);
  return docxTable(
    [
      { header: 'Indicador', width: 45 },
      { header: 'Valor', width: 55 },
    ],
    rows
  );
}

export async function buildDocxBuffer(children) {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 22, color: docxColor(IMPERIAL_BRAND.bodyTextHex) },
        },
      },
    },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}
