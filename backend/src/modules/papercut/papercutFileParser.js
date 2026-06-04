import path from 'path';
import { createRequire } from 'module';
import {
  csvTextoParaRecords,
  normalizarRecordsPapercut,
  recordsParaLinhas,
  recordsTemCabecalhoPapercut,
  textoTabularParaRecords,
} from './papercutParseCommon.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const EXTENSOES = new Set(['.csv', '.pdf', '.html', '.htm']);
const MIME_PERMITIDOS = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/pdf',
  'text/html',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

/** Converte buffer para UTF-8 (inclui ficheiros HTML guardados em UTF-16 no Windows). */
export function bufferParaUtf8Text(buffer) {
  if (!buffer?.length) return '';
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Conteúdo de uma célula HTML (sem colapsar estrutura de linhas). */
function stripHtmlCell(fragment) {
  return decodeHtmlEntities(
    String(fragment)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \f\v\r]+/g, ' ')
      .trim()
  );
}

/** Converte HTML em texto plano preservando quebras de linha (CSV embutido, etc.). */
function htmlParaTextoPlano(html) {
  return decodeHtmlEntities(
    String(html)
      .replace(/^\uFEFF/, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/pre>/gi, '\n')
      .replace(/<pre[^>]*>/gi, '')
      .replace(/<tr[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
  );
}

function isPdfBuffer(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isHtmlBuffer(buffer) {
  const head = bufferParaUtf8Text(buffer.subarray(0, Math.min(2000, buffer.length))).trimStart();
  return (
    /^<!DOCTYPE\s+html/i.test(head) ||
    /^<html[\s>]/i.test(head) ||
    /<head[\s>]/i.test(head) ||
    /<body[\s>]/i.test(head) ||
    /<table[\s>]/i.test(head)
  );
}

/** Texto com cabeçalho típico do PaperCut Print Logger (CSV ou HTML com CSV embutido). */
export function looksLikePapercutCsvText(text) {
  const sample = String(text || '')
    .replace(/^\uFEFF/, '')
    .slice(0, 4000);
  if (/papercut\s+print\s+logger/i.test(sample)) return true;
  if (/(?:^|[\n\r])[\s"]*time\s*,\s*user\s*,\s*pages/i.test(sample)) return true;
  return /(?:^|[\n\r])[\s"]*hora[\s\t,]+usu[aá]rio[\s\t,]+pag[ií]nas/i.test(sample);
}

/**
 * Detecta formato real do ficheiro (magic bytes têm prioridade sobre extensão/MIME).
 */
export function detectarFormatoFicheiro({ buffer, mimetype, originalname }) {
  if (!buffer?.length) {
    const err = new Error('Ficheiro vazio.');
    err.status = 400;
    throw err;
  }

  if (isPdfBuffer(buffer)) return 'pdf';

  const ext = path.extname(originalname || '').toLowerCase();
  const mime = String(mimetype || '').toLowerCase();
  const textSample = bufferParaUtf8Text(buffer);

  const extHtml = ext === '.html' || ext === '.htm' || mime === 'text/html';
  const extCsv = ext === '.csv' || mime.includes('csv');

  if (isHtmlBuffer(buffer)) return 'html';

  if (ext === '.pdf' || mime === 'application/pdf') return 'pdf';

  if (extHtml) {
    if (looksLikePapercutCsvText(textSample) && !/<[a-z][\s>]/i.test(textSample.slice(0, 200))) {
      return 'csv';
    }
    return 'html';
  }

  if (extCsv) return 'csv';

  const sample = bufferParaUtf8Text(buffer.subarray(0, Math.min(400, buffer.length)));
  if (sample.includes(',') && /time/i.test(sample)) return 'csv';

  return 'csv';
}

export function validarFicheiroUpload(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  if (EXTENSOES.has(ext)) return true;
  if (MIME_PERMITIDOS.has(mime)) return true;
  if (mime.startsWith('text/')) return true;

  return false;
}

function extrairCelulasTr(trInner) {
  const cells = [];
  const partes = String(trInner).split(/<\/t[dh]\s*>/i);
  for (const parte of partes) {
    const inner = parte.replace(/<t[dh]\b[^>]*>/gi, '').trim();
    if (!inner) continue;
    const texto = stripHtmlCell(inner);
    if (texto) cells.push(texto);
  }
  return cells;
}

function htmlTabelaParaRecords(html) {
  const records = [];
  const resultsTables = [];
  const resultsRe = /<table\b[^>]*\bclass\s*=\s*["'][^"']*\bresults\b[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = resultsRe.exec(html)) !== null) {
    resultsTables.push(tableMatch[1]);
  }
  const alvo = resultsTables.length ? resultsTables.join('\n') : html;

  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(alvo)) !== null) {
    const cells = extrairCelulasTr(trMatch[1]);
    if (cells.length) records.push(cells);
  }
  return records;
}

function htmlPreParaRecords(html) {
  const records = [];
  const preRe = /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi;
  let preMatch;
  while ((preMatch = preRe.exec(html)) !== null) {
    const inner = decodeHtmlEntities(preMatch[1].trim());
    if (!inner) continue;
    try {
      const rows = csvTextoParaRecords(inner);
      if (rows.length) records.push(...rows);
    } catch {
      records.push(...textoTabularParaRecords(inner));
    }
  }
  return records;
}

/**
 * Extrai bloco CSV do PaperCut mesmo quando está embutido em HTML complexo
 * (visualizador Print Logger, "Guardar como", etc.).
 */
function htmlExtrairCsvEmbebido(html) {
  const cleaned = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  let idx = cleaned.search(/Time\s*,\s*User\s*,\s*Pages\s*,\s*Copies/i);
  if (idx < 0) {
    idx = cleaned.search(/Hora\s*,\s*Usu[aá]rio\s*,\s*P[aá]ginas\s*,\s*C[oó]pias/i);
  }
  if (idx < 0) return null;

  const slice = decodeHtmlEntities(
    cleaned
      .slice(idx)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/pre>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
  );

  try {
    const rows = csvTextoParaRecords(slice);
    if (rows.length && recordsTemCabecalhoPapercut(rows)) return rows;
  } catch {
    const tabular = textoTabularParaRecords(slice);
    if (tabular.length && recordsTemCabecalhoPapercut(tabular)) return tabular;
  }
  return null;
}

function htmlBufferParaRecords(buffer) {
  const html = bufferParaUtf8Text(buffer);

  const rawTable = htmlTabelaParaRecords(html);
  const fromTable = normalizarRecordsPapercut(rawTable);
  if (fromTable.length && recordsTemCabecalhoPapercut(fromTable)) {
    return fromTable;
  }

  const fromEmbedded = htmlExtrairCsvEmbebido(html);
  if (fromEmbedded?.length) return fromEmbedded;

  const fromPre = htmlPreParaRecords(html);
  if (fromPre.length && recordsTemCabecalhoPapercut(fromPre)) {
    return fromPre;
  }

  const textoPlano = htmlParaTextoPlano(html).trim();
  if (textoPlano) {
    try {
      const fromCsv = csvTextoParaRecords(textoPlano);
      if (fromCsv.length && recordsTemCabecalhoPapercut(fromCsv)) {
        return fromCsv;
      }
    } catch {
      /* tentar tabular */
    }

    const fromTabular = textoTabularParaRecords(textoPlano);
    if (fromTabular.length && recordsTemCabecalhoPapercut(fromTabular)) {
      return fromTabular;
    }
  }

  if (fromTable.length) return fromTable;
  if (fromPre.length) return fromPre;

  return textoTabularParaRecords(textoPlano || html);
}

async function pdfBufferParaRecords(buffer) {
  let data;
  try {
    data = await pdfParse(buffer, { max: 0 });
  } catch (e) {
    const err = new Error(
      'Não foi possível ler o PDF. Verifique se o ficheiro não está protegido por senha ou corrompido.'
    );
    err.status = 400;
    err.cause = e;
    throw err;
  }

  const text = String(data?.text || '').trim();
  if (!text) {
    const err = new Error(
      'O PDF não contém texto seleccionável. Exporte novamente a partir do PaperCut (Print Logger) ou use o CSV.'
    );
    err.status = 400;
    throw err;
  }

  let records = textoTabularParaRecords(text);
  if (!records.length) {
    records = csvTextoParaRecords(text);
  }
  return records;
}

function csvBufferParaRecords(buffer) {
  const text = bufferParaUtf8Text(buffer);

  if (isPdfBuffer(buffer)) {
    const err = new Error('O ficheiro é um PDF mas foi enviado como CSV. Use a extensão .pdf.');
    err.status = 400;
    throw err;
  }
  if (isHtmlBuffer(buffer)) {
    return htmlBufferParaRecords(buffer);
  }

  try {
    return csvTextoParaRecords(text);
  } catch (e) {
    if (String(e.message || '').includes('quote') || String(e.message || '').includes('Quote')) {
      const err = new Error(
        'O ficheiro não é um CSV válido do PaperCut. Se exportou em PDF ou HTML, seleccione o formato correcto no upload.'
      );
      err.status = 400;
      throw err;
    }
    throw e;
  }
}

const ROTULO_ORIGEM = {
  csv: 'CSV',
  pdf: 'PDF',
  html: 'HTML',
};

/**
 * Analisa um ficheiro PaperCut (CSV, PDF ou HTML) e devolve linhas prontas para inserção.
 */
export async function parsePapercutFicheiro(
  { buffer, mimetype, originalname },
  provinciaId,
  departamentoId
) {
  const formato = detectarFormatoFicheiro({ buffer, mimetype, originalname });
  let records;

  switch (formato) {
    case 'pdf':
      records = await pdfBufferParaRecords(buffer);
      break;
    case 'html':
      records = htmlBufferParaRecords(buffer);
      break;
    case 'csv':
    default:
      records = csvBufferParaRecords(buffer);
      break;
  }

  const htmlTexto = formato === 'html' ? bufferParaUtf8Text(buffer) : '';

  const resultado = recordsParaLinhas(records, provinciaId, departamentoId, {
    origem: ROTULO_ORIGEM[formato] || formato,
    nomeFicheiro: originalname || '',
    htmlTexto,
  });

  return {
    ...resultado,
    formato,
    nome: originalname || 'ficheiro',
  };
}
