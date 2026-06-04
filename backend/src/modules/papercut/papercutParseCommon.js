import { createHash } from 'crypto';
import { parse } from 'csv-parse/sync';

export function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '');
}

const CABECALHO_ALIASES = {
  time: [
    'time',
    'hora',
    'tempo',
    'datadeimpressao',
    'datahora',
    'datadaimpressao',
    'horadeimpressao',
  ],
  user: ['user', 'utilizador', 'usuario', 'usuário', 'nome', 'nomeusuario'],
  pages: ['pages', 'paginas', 'páginas', 'numeropaginas', 'numero paginas', 'totaldepaginas', 'numpaginas'],
  copies: ['copies', 'copias', 'cópias', 'numerocopias', 'numero copias', 'numcopias'],
  printer: [
    'printer',
    'impressora',
    'nomeimpressora',
    'nome impressora',
    'filadeimpressao',
    'filaimpressao',
    'fila',
    'queue',
    'printerqueue',
  ],
  document: [
    'document',
    'documentname',
    'documento',
    'nomedodocumento',
    'nomedocumento',
    'titulo',
    'nometitulo',
  ],
  client: [
    'client',
    'cliente',
    'computador',
    'workstation',
    'estacao',
    'estação',
    'nomeestacao',
    'maquina',
    'posto',
  ],
  paper: ['paper', 'papersize', 'tamanhodopapel', 'papel', 'tamanhopapel', 'formato'],
  language: ['language', 'idioma', 'linguagem', 'lang'],
  height: ['height', 'altura', 'alturamm'],
  width: ['width', 'largura', 'larguramm'],
  duplex: ['duplex', 'frenteverso'],
  grayscale: [
    'grayscale',
    'greyscale',
    'escaladecinza',
    'escalade cinza',
    'cores',
    'mododecor',
    'modocor',
    'cor',
  ],
  size: ['size', 'tamanho', 'tamanhodoficheiro', 'tamanhoarquivo', 'tamficheiro'],
};

/** Regras por prefixo (cabeçalhos PT do Print Logger com variações). */
const CABECALHO_PREFIXOS = [
  ['time', ['hora', 'time', 'data']],
  ['user', ['usuario', 'utilizador', 'user']],
  ['pages', ['pagina', 'page']],
  ['copies', ['copia', 'copi']],
  ['printer', ['fila', 'impress', 'printer', 'printqueue']],
  ['document', ['docum', 'titulo']],
  ['client', ['estacao', 'estac', 'client', 'comput', 'workst', 'posto', 'maquina']],
  ['grayscale', ['escala', 'cinza', 'gray', 'grey', 'cor']],
  ['duplex', ['duplex', 'frente']],
];

function cabecalhoPorPrefixo(n) {
  for (const [canon, prefixes] of CABECALHO_PREFIXOS) {
    if (prefixes.some((p) => n.startsWith(p))) return canon;
  }
  return null;
}

export function mapHeaderToCanonical(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i += 1) {
    const n = normalizeHeader(headers[i]);
    if (!n) continue;

    let canon = null;
    for (const [key, keys] of Object.entries(CABECALHO_ALIASES)) {
      if (keys.some((k) => n === normalizeHeader(k))) {
        canon = key;
        break;
      }
    }
    if (!canon) canon = cabecalhoPorPrefixo(n);
    if (canon) map[i] = canon;
  }
  return map;
}

export function validarCabecalhoCsv(headers) {
  const idxMap = mapHeaderToCanonical(headers);
  const found = new Set(Object.values(idxMap));
  const required = ['time', 'user', 'pages', 'copies', 'printer', 'document'];
  const missing = required.filter((c) => !found.has(c));
  return { ok: missing.length === 0, missing, idxMap, headers };
}

export function indiceLinhaCabecalho(records, maxScan = 30) {
  for (let i = 0; i < Math.min(maxScan, records.length); i += 1) {
    const row = records[i];
    if (!Array.isArray(row) || !row.length) continue;
    if (validarCabecalhoCsv(row).ok) return i;
  }
  return -1;
}

export function linhaParaObjeto(record, idxMap, colOffset = 0) {
  const o = {};
  for (const [idx, key] of Object.entries(idxMap)) {
    const col = Number(idx) + colOffset;
    if (key && col >= 0 && col < record.length) o[key] = record[col];
  }
  return o;
}

/**
 * Ficheiros .htm do Print Logger costumam ter coluna extra à esquerda (nº de linha)
 * que desloca Time/User em relação ao cabeçalho.
 */
export function detectarOffsetColunaData(records, headerIdx, idxMap, dataBase = null) {
  const timeCol = Number(Object.entries(idxMap).find(([, k]) => k === 'time')?.[0]);
  if (!Number.isFinite(timeCol)) return 0;

  for (let r = headerIdx + 1; r < Math.min(headerIdx + 20, records.length); r += 1) {
    const row = records[r];
    if (!Array.isArray(row) || row.every((c) => !String(c || '').trim())) continue;

    const t0 = String(row[timeCol] || '').trim();
    if (isHoraApenas(t0) || parseDate(t0, dataBase)) return 0;

    for (const off of [1, 2]) {
      const val = row[timeCol + off];
      if (parseDate(val, dataBase)) return off;
      const joined = [row[timeCol + off], row[timeCol + off + 1]]
        .map((c) => String(c || '').trim())
        .filter(Boolean)
        .join(' ');
      if (joined && parseDate(joined, dataBase)) return off;
    }
  }
  return 0;
}

function parseBool(v) {
  const s = String(v || '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
}

export function parsePapercutDuplex(v) {
  const s = String(v || '').toLowerCase().trim();
  if (s === 'yes' || s === 'sim') return true;
  if (s === 'no' || s === 'nao' || s === 'não' || s === 'nao.') return false;
  if (s.includes('not') && s.includes('duplex')) return false;
  if (s.includes('duplex')) return true;
  return parseBool(v);
}

export function parsePapercutGrayscale(v) {
  const s = String(v || '').toLowerCase().trim();
  if (s === 'yes' || s === 'sim') return true;
  if (s === 'no' || s === 'nao' || s === 'não') return false;
  if (s.includes('not') && s.includes('gray')) return false;
  if (s.includes('gray') || s.includes('grey')) return true;
  return parseBool(v);
}

export function parseIntSafe(v) {
  const n = parseInt(String(v || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

const MESES_EN = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export function isHoraApenas(s) {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(s || '').trim());
}

/** Data do dia (ficheiro .htm ou título "21 May 2026"). */
export function extrairDataBasePapercut({ nomeFicheiro = '', html = '' } = {}) {
  const texto = `${nomeFicheiro}\n${String(html).slice(0, 12000)}`;

  const iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]) - 1, day: Number(iso[3]) };
  }

  const en = texto.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (en) {
    const mes = MESES_EN[en[2].toLowerCase()];
    if (mes != null) {
      return { year: Number(en[3]), month: mes, day: Number(en[1]) };
    }
  }
  return null;
}

export function combinarDataHora(dataBase, horaStr) {
  if (!dataBase || !horaStr) return null;
  const hm = String(horaStr)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!hm) return null;
  const d = new Date(
    dataBase.year,
    dataBase.month,
    dataBase.day,
    Number(hm[1]),
    Number(hm[2]),
    hm[3] ? Number(hm[3]) : 0
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseDate(v, dataBase = null) {
  const s = String(v || '')
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ');
  if (!s) return null;
  if (/^\d{1,4}$/.test(s)) return null;

  if (isHoraApenas(s) && dataBase) {
    return combinarDataHora(dataBase, s);
  }
  if (isHoraApenas(s)) return null;

  const iso = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/i
  );
  if (iso) {
    const d = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      iso[4] != null ? Number(iso[4]) : 0,
      iso[5] != null ? Number(iso[5]) : 0,
      iso[6] != null ? Number(iso[6]) : 0
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dmy = s.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/i
  );
  if (dmy) {
    let ano = Number(dmy[3]);
    if (ano < 100) ano += 2000;
    const d = new Date(
      ano,
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      dmy[4] != null ? Number(dmy[4]) : 0,
      dmy[5] != null ? Number(dmy[5]) : 0,
      dmy[6] != null ? Number(dmy[6]) : 0
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Cabeçalho/dados numa única célula separados por tab (exportação PT do Print Logger). */
/** Cabeçalho PT/EN numa célula só com espaços (tabs já convertidos pelo HTML). */
export function expandirCabecalhoCelulaUnica(records) {
  if (!records?.length) return records;

  const out = records.map((row) => (Array.isArray(row) ? [...row] : row));
  for (let i = 0; i < Math.min(8, out.length); i += 1) {
    const row = out[i];
    if (!Array.isArray(row) || row.length !== 1) continue;
    const txt = String(row[0] || '');
    if (txt.includes('\t')) continue;
    if (!/\b(hora|time)\b/i.test(txt) || !/\b(usuario|user|utilizador)\b/i.test(txt)) continue;

    const cols = txt.match(
      /Hora|Usu[aá]rio|Paginas|P[aá]ginas|C[oó]pias|Fila de Impress[aã]o|Documento|Esta[cç][aã]o|Duplex|Escala de cinza|Time|User|Pages|Copies|Printer|Document|Client|Paper Size|Language|Height|Width|Grayscale|Size/gi
    );
    if (cols && cols.length >= 4) {
      out[i] = cols;
      break;
    }
  }
  return out;
}

export function expandirLinhasComTabs(records) {
  if (!records?.length) return records;

  const expanded = [];
  for (const row of records) {
    if (!Array.isArray(row)) continue;
    const unica = String(row[0] ?? '');
    if (row.length === 1 && unica.includes('\t')) {
      expanded.push(unica.split('\t').map((c) => c.trim()));
      continue;
    }
    expanded.push(row);
  }
  return expanded.length ? expanded : records;
}

/** Linhas HTML do Print Logger com uma célula por linha (CSV inteiro na célula). */
export function expandirRecordsCelulaUnica(records) {
  if (!records?.length) return records;

  const expanded = [];
  for (const row of records) {
    if (!Array.isArray(row)) continue;
    const linha = String(row[0] ?? '').trim();
    if (row.length === 1 && linha.includes('\t')) {
      expanded.push(linha.split('\t').map((c) => c.trim()));
      continue;
    }
    if (row.length === 1 && linha.includes(',')) {
      try {
        const parsed = parse(linha, { relax_column_count: true, trim: true });
        if (parsed[0]?.length >= 4) {
          expanded.push(parsed[0]);
          continue;
        }
      } catch {
        /* mantém linha original */
      }
    }
    expanded.push(row);
  }
  return expanded.length ? expanded : records;
}

export function recordsTemCabecalhoPapercut(records) {
  return indiceLinhaCabecalho(normalizarRecordsPapercut(records)) >= 0;
}

export function normalizarRecordsPapercut(records) {
  return expandirRecordsCelulaUnica(
    expandirCabecalhoCelulaUnica(expandirLinhasComTabs(records))
  );
}

export function dedupHash(provinciaId, departamentoId, o) {
  const raw = [
    provinciaId,
    departamentoId,
    String(o.time || ''),
    String(o.user || ''),
    String(o.pages || ''),
    String(o.copies || ''),
    String(o.printer || ''),
    String(o.document || ''),
    String(o.size || ''),
  ].join('|');
  return createHash('sha256').update(raw).digest('hex');
}

export function objetoParaLinhaRegisto(o, provinciaId, departamentoId, dataBase = null) {
  const imprimido_em = parseDate(o.time, dataBase);
  const paginas = Math.max(0, parseIntSafe(o.pages));
  const copias = Math.max(1, parseIntSafe(o.copies) || 1);
  const duplex = parsePapercutDuplex(o.duplex);
  const grayscale = parsePapercutGrayscale(o.grayscale);
  const hash = dedupHash(provinciaId, departamentoId, o);
  return {
    import_job_id: null,
    provincia_id: provinciaId,
    departamento_id: departamentoId,
    dedup_hash: hash,
    imprimido_em,
    usuario_papercut: o.user ? String(o.user).slice(0, 255) : null,
    paginas,
    copias,
    impressora: o.printer ? String(o.printer).slice(0, 255) : null,
    documento: o.document ? String(o.document).slice(0, 512) : null,
    cliente: o.client ? String(o.client).slice(0, 255) : null,
    papel: o.paper ? String(o.paper).slice(0, 120) : null,
    idioma: o.language ? String(o.language).slice(0, 64) : null,
    altura_mm: parseIntSafe(o.height) || null,
    largura_mm: parseIntSafe(o.width) || null,
    duplex,
    grayscale,
    tamanho_bytes: parseIntSafe(o.size) || null,
  };
}

/**
 * Converte matriz de células (CSV, tabela PDF ou HTML) em linhas de importação.
 */
export function recordsParaLinhas(
  records,
  provinciaId,
  departamentoId,
  { origem = 'ficheiro', nomeFicheiro = '', htmlTexto = '' } = {}
) {
  const dataBase =
    extrairDataBasePapercut({ nomeFicheiro, html: htmlTexto }) ||
    extrairDataBasePapercut({ nomeFicheiro });
  if (!records?.length) {
    const err = new Error('Nenhum dado encontrado no ficheiro.');
    err.status = 400;
    throw err;
  }

  records = normalizarRecordsPapercut(records);

  const headerIdx = indiceLinhaCabecalho(records);
  if (headerIdx < 0) {
    const err = new Error(
      'Não foi encontrada uma linha de cabeçalho válida (Time/Hora, User/Usuário, Pages/Páginas, Copies/Cópias, Printer/Fila de Impressão, Document/Documento). ' +
        `Confirme que é um relatório do PaperCut Print Logger (${origem}).`
    );
    err.status = 400;
    throw err;
  }

  const headers = records[headerIdx];
  const { ok, missing, idxMap } = validarCabecalhoCsv(headers);
  if (!ok) {
    const err = new Error(`Colunas em falta: ${missing.join(', ')}`);
    err.status = 400;
    err.details = { missing };
    throw err;
  }

  const colOffset = detectarOffsetColunaData(records, headerIdx, idxMap, dataBase);

  const linhas = [];
  const erros = [];
  for (let r = headerIdx + 1; r < records.length; r += 1) {
    const row = records[r];
    if (!Array.isArray(row) || row.every((c) => !String(c || '').trim())) continue;
    let o = linhaParaObjeto(row, idxMap, colOffset);
    if (!parseDate(o.time, dataBase)) {
      const timeCol = Number(Object.entries(idxMap).find(([, k]) => k === 'time')?.[0]);
      if (Number.isFinite(timeCol)) {
        const joined = [row[timeCol + colOffset], row[timeCol + colOffset + 1]]
          .map((c) => String(c || '').trim())
          .filter(Boolean)
          .join(' ');
        if (joined) o = { ...o, time: joined };
      }
    }
    const docCell = String(o.document || '');
    const attr = docCell.match(/\b(A[0-9]|Letter|Legal)\b[^,]*,\s*([^,]+),\s*(\w+)/i);
    if (attr) {
      if (!o.paper) o.paper = attr[1];
      if (!o.size) o.size = attr[2];
      if (!o.language) o.language = attr[3];
      o.document = docCell.split(/\s+A[0-9],|\s+Letter,|\s+Legal,/i)[0].trim();
    }

    try {
      const linha = objetoParaLinhaRegisto(o, provinciaId, departamentoId, dataBase);
      if (!linha.imprimido_em) {
        erros.push({
          linha: r + 1,
          erro: `Data/hora inválida na coluna Time: "${String(o.time || '').slice(0, 40)}"`,
        });
        continue;
      }
      linhas.push(linha);
    } catch (e) {
      erros.push({ linha: r + 1, erro: e.message });
    }
  }

  if (!linhas.length && erros.length) {
    const err = new Error('Nenhuma linha válida após o cabeçalho.');
    err.status = 400;
    err.details = { erros: erros.slice(0, 10) };
    throw err;
  }

  return { linhas, erros, total: linhas.length };
}

export function csvTextoParaRecords(text) {
  return parse(text.replace(/^\uFEFF/, ''), {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

export function linhaTextoParaCelulas(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;

  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map((c) => c.trim());
  }

  if (trimmed.includes(',') && trimmed.split(',').length >= 4) {
    try {
      const rows = parse(trimmed, { relax_column_count: true, trim: true });
      if (rows[0]?.length) return rows[0];
    } catch {
      /* fallback split */
    }
    return trimmed.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  }

  const porEspacos = trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (porEspacos.length >= 4) return porEspacos;

  return null;
}

export function textoTabularParaRecords(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const records = [];
  for (const line of lines) {
    const cells = linhaTextoParaCelulas(line);
    if (cells?.length) records.push(cells);
  }
  return records;
}
