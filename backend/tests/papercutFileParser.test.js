import {
  detectarFormatoFicheiro,
  looksLikePapercutCsvText,
  parsePapercutFicheiro,
} from '../src/modules/papercut/papercutFileParser.js';

const PROV = 'b1a0dac1-4fb3-11f1-955a-a4bb6d171c32';
const DEPT = '5db8f378-4fb6-11f1-955a-a4bb6d171c32';

const CABECALHO =
  'Time,User,Pages,Copies,Printer,Document Name,Client,Paper Size,Language,Height,Width,Duplex,Grayscale,Size';
const LINHA =
  '2026-05-07 12:18:00,Zimila,1,1,KONICA MINOLTA,"Microsoft Word - teste",DESKTOP-L82G92E,A4,PCL6,,,NOT DUPLEX,NOT GRAYSCALE,16';

function buf(text, name = 'ficheiro.csv', mime = 'text/plain') {
  return {
    buffer: Buffer.from(text, 'utf8'),
    originalname: name,
    mimetype: mime,
  };
}

describe('papercutFileParser — HTML', () => {
  test('detecta HTML com tabela', () => {
    const html = `<!DOCTYPE html><html><body><table><tr><th>Time</th></tr></table></body></html>`;
    expect(detectarFormatoFicheiro(buf(html, 'log.html', 'text/html'))).toBe('html');
  });

  test('detecta CSV embutido em ficheiro .html sem tags de tabela', () => {
    const csv = `PaperCut Print Logger\n${CABECALHO}\n${LINHA}`;
    expect(detectarFormatoFicheiro(buf(csv, 'log.html', 'text/html'))).toBe('csv');
  });

  test('looksLikePapercutCsvText reconhece cabeçalho PaperCut', () => {
    expect(looksLikePapercutCsvText(`${CABECALHO}\n${LINHA}`)).toBe(true);
  });

  test('importa HTML com tabela (mesma estrutura que CSV)', async () => {
    const html = `<!DOCTYPE html>
<html><head><title>PaperCut Print Logger</title></head><body>
<table border="1">
<tr>
<th>Time</th><th>User</th><th>Pages</th><th>Copies</th><th>Printer</th>
<th>Document Name</th><th>Client</th><th>Paper Size</th><th>Language</th>
<th>Height</th><th>Width</th><th>Duplex</th><th>Grayscale</th><th>Size</th>
</tr>
<tr>
<td>2026-05-07 12:18:00</td><td>Zimila</td><td>1</td><td>1</td>
<td>KONICA MINOLTA bizhub</td><td>Microsoft Word - teste</td><td>DESKTOP-L82G92E</td>
<td>A4</td><td>PCL6</td><td></td><td></td><td>NOT DUPLEX</td><td>NOT GRAYSCALE</td><td>16</td>
</tr>
</table>
</body></html>`;

    const { linhas, formato, erros } = await parsePapercutFicheiro(
      buf(html, 'papercut-log.html', 'text/html'),
      PROV,
      DEPT
    );

    expect(formato).toBe('html');
    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].usuario_papercut).toBe('Zimila');
    expect(linhas[0].paginas).toBe(1);
    expect(linhas[0].documento).toContain('Microsoft Word');
  });

  test('importa HTML com CSV em <pre>', async () => {
    const html = `<html><body><pre>
PaperCut Print Logger - http://www.papercut.biz/
${CABECALHO}
${LINHA}
</pre></body></html>`;

    const { linhas, formato } = await parsePapercutFicheiro(
      buf(html, 'log.htm', 'text/html'),
      PROV,
      DEPT
    );

    expect(formato).toBe('html');
    expect(linhas).toHaveLength(1);
    expect(linhas[0].usuario_papercut).toBe('Zimila');
  });

  test('CSV continua a funcionar', async () => {
    const csv = `PaperCut Print Logger\n${CABECALHO}\n${LINHA}`;
    const { linhas, formato } = await parsePapercutFicheiro(buf(csv, 'log.csv', 'text/csv'), PROV, DEPT);
    expect(formato).toBe('csv');
    expect(linhas).toHaveLength(1);
  });

  test('importa HTML Print Logger (uma célula por linha com CSV)', async () => {
    const html = `<!DOCTYPE html><html><body><table>
<tr><td>PaperCut Print Logger</td></tr>
<tr><td>${CABECALHO}</td></tr>
<tr><td>${LINHA}</td></tr>
</table></body></html>`;

    const { linhas, erros } = await parsePapercutFicheiro(
      buf(html, 'papercut-print-log.html', 'text/html'),
      PROV,
      DEPT
    );

    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].imprimido_em).toBeInstanceOf(Date);
    expect(linhas[0].usuario_papercut).toBe('Zimila');
  });

  test('importa HTML Print Logger real (hora só + data no ficheiro)', async () => {
    const html = `<!DOCTYPE html><html><head><title>Print Logs - 21 May 2026</title></head><body>
<table class="results"><tr>
<th>Time</th><th>User</th><th>Pages</th><th>Copies</th><th>Printer</th><th>Document</th><th>Client</th><th>Duplex</th><th>Grayscale</th>
</tr><tr>
<td>12:10:38</td><td>Apolito</td><td>1</td><td>1</td><td>KONICA</td><td>Invoice.pdf</td><td>PC01</td><td>No</td><td>Yes</td>
</tr></table></body></html>`;

    const { linhas, erros } = await parsePapercutFicheiro(
      buf(html, 'papercut-print-log-2026-05-21.htm', 'text/html'),
      PROV,
      DEPT
    );

    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].usuario_papercut).toBe('Apolito');
    expect(linhas[0].imprimido_em.getFullYear()).toBe(2026);
    expect(linhas[0].imprimido_em.getMonth()).toBe(4);
    expect(linhas[0].imprimido_em.getDate()).toBe(21);
    expect(linhas[0].grayscale).toBe(true);
    expect(linhas[0].duplex).toBe(false);
  });

  test('importa HTML com coluna de índice (formato .htm Print Logger)', async () => {
    const html = `<!DOCTYPE html><html><body><table>
<tr><th>Time</th><th>User</th><th>Pages</th><th>Copies</th><th>Printer</th><th>Document Name</th></tr>
<tr><td>1</td><td>2026-05-07 12:18:00</td><td>Zimila</td><td>1</td><td>1</td><td>KONICA</td><td>Test doc</td></tr>
</table></body></html>`;

    const { linhas, erros } = await parsePapercutFicheiro(
      buf(html, 'papercut-print-log-2026-05-07.htm', 'text/html'),
      PROV,
      DEPT
    );

    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].imprimido_em).toBeInstanceOf(Date);
    expect(linhas[0].imprimido_em.getFullYear()).toBe(2026);
    expect(linhas[0].usuario_papercut).toBe('Zimila');
  });

  test('importa HTML com cabeçalho em português (Print Logger PT)', async () => {
    const html = `<!DOCTYPE html><html><head><title>Registos - 21 Maio 2026</title></head><body>
<table class="results"><tr>
<th>Hora</th><th>Usuário</th><th>Paginas</th><th>Cópias</th><th>Fila de Impressão</th>
<th>Documento</th><th>Estação</th><th>Duplex</th><th>Escala de cinza</th>
</tr><tr>
<td>14:30:00</td><td>Apolito</td><td>2</td><td>1</td><td>KONICA MINOLTA</td>
<td>Relatorio.pdf</td><td>PC-01</td><td>Não</td><td>Sim</td>
</tr></table></body></html>`;

    const { linhas, erros } = await parsePapercutFicheiro(
      buf(html, 'papercut-print-log-2026-05-21.htm', 'text/html'),
      PROV,
      DEPT
    );

    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].usuario_papercut).toBe('Apolito');
    expect(linhas[0].paginas).toBe(2);
    expect(linhas[0].impressora).toContain('KONICA');
    expect(linhas[0].duplex).toBe(false);
    expect(linhas[0].grayscale).toBe(true);
  });

  test('importa HTML com cabeçalho PT numa célula (tabs)', async () => {
    const html = `<table class="results"><tr><th>Hora\tUsuário\tPaginas\tCópias\tFila de Impressão\tDocumento\tEstação\tDuplex\tEscala de cinza</th></tr>
<tr><td>09:00:00</td><td>Teste</td><td>1</td><td>1</td><td>HP</td><td>doc.pdf</td><td>PC</td><td>No</td><td>Yes</td></tr></table>`;

    const { linhas } = await parsePapercutFicheiro(
      buf(html, 'log-2026-05-20.htm', 'text/html'),
      PROV,
      DEPT
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].usuario_papercut).toBe('Teste');
  });

  test('importa HTML com CSV embutido entre tags diversas', async () => {
    const html = `<!DOCTYPE html><html><head><title>Log</title></head><body>
<div><span>PaperCut Print Logger</span></div>
<p>${CABECALHO}</p>
<div>${LINHA}</div>
</body></html>`;

    const { linhas } = await parsePapercutFicheiro(buf(html, 'log.html', 'text/html'), PROV, DEPT);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].imprimido_em).not.toBeNull();
  });
});
