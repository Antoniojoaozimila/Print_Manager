import http from 'http';
import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Logótipo oficial em `backend/assets/branding/imperial-logo.png` (copiado do anexo institucional). */
export const IMPERIAL_LOGO_FILE = join(__dirname, '../../assets/branding/imperial-logo.png');

/**
 * Identidade Imperial — verde floresta, cinzento e contraste escuro (alinhado ao logótipo institucional).
 * @see https://imperialinsurance-mz.com/
 */
export const IMPERIAL_BRAND = {
  company: 'IMPERIAL INSURANCE MOÇAMBIQUE, S.A.',
  subtitle: 'Gestão de impressão e consumíveis — relatório interno',
  website: 'https://imperialinsurance-mz.com/',
  primaryHex: '#1B5E20',
  secondaryHex: '#BDBDBD',
  accentHex: '#C8E6C9',
  chartBarHex: '#2E7D32',
  headerBandHex: '#0a1f0c',
  textOnPrimaryHex: '#ffffff',
  bodyTextHex: '#1a1a1a',
  mutedTextHex: '#616161',
  tableStripeHex: '#f1f8f4',
};

export function excelArgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length === 6) return `FF${h.toUpperCase()}`;
  return `FF${h.slice(-6).toUpperCase()}`;
}

function fetchUrlBuffer(targetUrl, depth = 0) {
  if (depth > 4) return Promise.resolve(null);
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(targetUrl);
    } catch {
      resolve(null);
      return;
    }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(
      targetUrl,
      { timeout: 12000, headers: { 'User-Agent': 'PrintManager-Export/1.0' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, targetUrl).href;
          res.resume();
          fetchUrlBuffer(next, depth + 1).then(resolve);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve(buf.length > 64 ? buf : null);
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function sniffImageExtension(buf) {
  if (!buf || buf.length < 4) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  return 'png';
}

/**
 * Logótipo para PDF/Excel/Word: ficheiro local → `IMPERIAL_LOGO_PATH` → `IMPERIAL_LOGO_URL` → URL pública.
 */
export async function fetchImperialLogoBuffer() {
  const paths = [process.env.IMPERIAL_LOGO_PATH, IMPERIAL_LOGO_FILE].filter(Boolean);
  for (const p of paths) {
    try {
      if (existsSync(p)) {
        const buf = readFileSync(p);
        if (buf.length > 64) return buf;
      }
    } catch {
      /* continuar */
    }
  }
  const url = process.env.IMPERIAL_LOGO_URL;
  if (url) {
    const b = await fetchUrlBuffer(url);
    if (b) return b;
  }
  return fetchUrlBuffer('https://imperialinsurance-mz.com/wp-content/uploads/2019/05/logo-imperial-1.png');
}

export function imageExtensionForWorkbook(buf) {
  return sniffImageExtension(buf);
}
