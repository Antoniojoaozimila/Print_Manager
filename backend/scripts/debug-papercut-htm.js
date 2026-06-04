/**
 * Uso: node scripts/debug-papercut-htm.js "C:\caminho\papercut-print-log-2026-05-07.htm"
 */
import fs from 'fs';
import { parsePapercutFicheiro } from '../src/modules/papercut/papercutFileParser.js';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Indique o caminho de um ficheiro .htm do PaperCut.');
  process.exit(1);
}

const buffer = fs.readFileSync(file);
const r = await parsePapercutFicheiro(
  { buffer, mimetype: 'text/html', originalname: file },
  'b1a0dac1-4fb3-11f1-955a-a4bb6d171c32',
  '5db8f378-4fb6-11f1-955a-a4bb6d171c32'
);

console.log('formato:', r.formato);
console.log('linhas:', r.linhas.length, 'erros:', r.erros.length);
if (r.linhas[0]) {
  console.log('primeira linha:', {
    imprimido_em: r.linhas[0].imprimido_em,
    usuario: r.linhas[0].usuario_papercut,
    paginas: r.linhas[0].paginas,
  });
}
if (r.erros[0]) console.log('primeiro erro:', r.erros[0]);
