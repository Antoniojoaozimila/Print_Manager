import { useEffect, useState } from 'react';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';

export default function PapercutGestaoPage() {
  const [catalogos, setCatalogos] = useState({ provincias: [], departamentos: [] });
  const [provinciaId, setProvinciaId] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [nomeLote, setNomeLote] = useState('');
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [imports, setImports] = useState([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  function nomeFicheiroDoContentDisposition(headers, fallback) {
    const cd = headers?.['content-disposition'] || headers?.['Content-Disposition'];
    if (!cd || typeof cd !== 'string') return fallback;
    const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
    if (m) {
      try {
        return decodeURIComponent(m[1] || m[2] || fallback);
      } catch {
        return m[2] || fallback;
      }
    }
    return fallback;
  }

  useEffect(() => {
    api.get('/papercut/catalogos').then(({ data }) => setCatalogos(data.data));
    api.get('/papercut/importacoes', { params: { limit: 20 } }).then(({ data }) => setImports(data.data));
  }, []);

  async function enviarImport() {
    setMsg('');
    if (!files.length || !provinciaId || !departamentoId) {
      setMsg('Seleccione província, departamento e ficheiros CSV, HTML ou PDF.');
      return;
    }
    const fd = new FormData();
    fd.append('provincia_id', provinciaId);
    fd.append('departamento_id', departamentoId);
    if (nomeLote) fd.append('nome_lote', nomeLote);
    for (const f of files) fd.append('files', f);
    try {
      const { data } = await api.post('/papercut/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const aviso = data.data.aviso_ficheiros_ignorados?.length
        ? ` (${data.data.aviso_ficheiros_ignorados.length} ficheiro(s) ignorado(s))`
        : '';
      const erros = data.data.linhas_erro || 0;
      const dup = data.data.linhas_duplicadas || 0;
      const extra =
        erros > 0 ? ` ${erros} linha(s) com erro (ex.: data inválida).` : dup > 0 ? ` ${dup} duplicada(s).` : '';
      setMsg(`Importação: ${data.data.linhas_inseridas} linhas inseridas.${extra}${aviso}`);
      const r = await api.get('/papercut/importacoes', { params: { limit: 20 } });
      setImports(r.data.data);
    } catch (e) {
      setMsg(e.response?.data?.error || e.message || 'Erro na importação');
    }
  }

  async function erroDeBlob(e, fallback) {
    const data = e.response?.data;
    if (data instanceof Blob) {
      try {
        const txt = await data.text();
        const j = JSON.parse(txt);
        return j.error || j.message || fallback;
      } catch {
        return fallback;
      }
    }
    return e.response?.data?.error || e.message || fallback;
  }

  async function downloadRelatorio(fmt) {
    setMsg('');
    try {
      const r = await api.get('/papercut/relatorios/mensal/export', {
        params: { ano, mes, formato: fmt },
        responseType: 'blob',
      });
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'docx' ? 'docx' : 'pdf';
      const fallback = `imperial-papercut-${ano}-${String(mes).padStart(2, '0')}.${ext}`;
      const nome = nomeFicheiroDoContentDisposition(r.headers, fallback);
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Descarregado: ${nome}`);
    } catch (e) {
      setMsg(await erroDeBlob(e, 'Erro ao exportar'));
    }
  }

  async function downloadRelatorioDemo(fmt) {
    setMsg('');
    try {
      const r = await api.get('/papercut/relatorios/demo/export', {
        params: { formato: fmt },
        responseType: 'blob',
      });
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'docx' ? 'docx' : 'pdf';
      const nome = nomeFicheiroDoContentDisposition(r.headers, `imperial-papercut-demo.${ext}`);
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Demo descarregado: ${nome}`);
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro ao exportar demonstração');
    }
  }

  return (
    <div className="page-content max-w-3xl">
      <PageHeader
        badge="PaperCut"
        title="Importação e relatórios"
        subtitle="Importe relatórios PaperCut (CSV, HTML ou PDF) por província/departamento e exporte relatórios mensais."
      />
      {msg && <p className="alert-imperial-warning">{msg}</p>}

      <section className="app-card space-y-3">
        <h2 className="text-white font-medium text-sm hud-section-title">Importar relatórios</h2>
        <p className="text-xs text-slate-500">
          Envie um ou vários ficheiros do PaperCut Print Logger em <strong className="text-slate-400">CSV</strong>,{' '}
          <strong className="text-slate-400">HTML</strong> ou <strong className="text-slate-400">PDF</strong>. Os dados
          são normalizados para o mesmo modelo e incluídos nos relatórios XLSX (secção PaperCut).
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <select
            className="select-imperial"
            value={provinciaId}
            onChange={(e) => setProvinciaId(e.target.value)}
          >
            <option value="">Província</option>
            {catalogos.provincias?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <select
            className="select-imperial"
            value={departamentoId}
            onChange={(e) => setDepartamentoId(e.target.value)}
          >
            <option value="">Departamento</option>
            {catalogos.departamentos?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </div>
        <input
          type="file"
          accept=".csv,.pdf,.html,.htm,text/csv,application/pdf,text/html"
          multiple
          onChange={(e) => setFiles([...e.target.files])}
          className="text-sm text-slate-400"
        />
        <button type="button" onClick={enviarImport} className="btn-imperial">
          Importar
        </button>
      </section>

      <section className="app-card space-y-3">
        <h2 className="text-white font-medium text-sm hud-section-title">Relatório mensal (documento único)</h2>
        <p className="text-xs text-slate-500">
          Um ficheiro com várias abas: resumo, volumes, consumíveis do mês, resumo e detalhe de impressões por utilizador.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="number"
            className="w-20 input-imperial py-1.5"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            aria-label="Ano"
          />
          <input
            type="number"
            min={1}
            max={12}
            className="w-14 input-imperial py-1.5"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            aria-label="Mês"
          />
          {['pdf', 'xlsx', 'docx'].map((fmt) => (
            <button
              key={fmt}
              type="button"
              className="btn-imperial-outline text-sm py-1.5 px-3"
              onClick={() => downloadRelatorio(fmt)}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-border">
          <span className="text-xs text-slate-500 w-full">Modelo de demonstração:</span>
          {['pdf', 'xlsx', 'docx'].map((fmt) => (
            <button
              key={`d-${fmt}`}
              type="button"
              className="btn-imperial-outline text-xs py-1 px-2"
              onClick={() => downloadRelatorioDemo(fmt)}
            >
              Demo {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {imports.length > 0 && (
        <ul className="text-xs text-slate-500 space-y-1">
          {imports.slice(0, 5).map((j) => (
            <li key={j.id}>
              {j.nome_lote || j.id.slice(0, 8)} — {j.status} ({j.linhas_inseridas} linhas)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
