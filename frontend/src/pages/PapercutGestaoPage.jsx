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
  const [utilizadores, setUtilizadores] = useState([]);
  const [filtroUtilizador, setFiltroUtilizador] = useState('');
  const [utilizadorApagar, setUtilizadorApagar] = useState('');
  const [aCarregarUtilizadores, setACarregarUtilizadores] = useState(false);
  const [aApagar, setAApagar] = useState(false);

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

  async function carregarUtilizadores() {
    setACarregarUtilizadores(true);
    try {
      const { data } = await api.get('/papercut/utilizadores');
      setUtilizadores(data.data || []);
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro ao carregar utilizadores');
    } finally {
      setACarregarUtilizadores(false);
    }
  }

  useEffect(() => {
    api.get('/papercut/catalogos').then(({ data }) => setCatalogos(data.data));
    api.get('/papercut/importacoes', { params: { limit: 20 } }).then(({ data }) => setImports(data.data));
    carregarUtilizadores();
  }, []);

  const utilizadoresFiltrados = utilizadores.filter((u) => {
    const q = filtroUtilizador.trim().toLowerCase();
    if (!q) return true;
    return String(u.usuario || '').toLowerCase().includes(q);
  });

  const utilizadorSeleccionado = utilizadores.find((u) => u.usuario === utilizadorApagar);

  async function apagarRegistosUtilizador() {
    if (!utilizadorApagar) {
      setMsg('Seleccione o utilizador cujos registos pretende apagar.');
      return;
    }
    const u = utilizadorSeleccionado;
    const linhas = u?.total_linhas ?? 0;
    const ok = window.confirm(
      `Apagar TODOS os ${linhas.toLocaleString('pt-MZ')} registos de impressão do utilizador "${utilizadorApagar}"?\n\nEsta acção é irreversível.`
    );
    if (!ok) return;

    setAApagar(true);
    setMsg('');
    try {
      const { data } = await api.post('/papercut/utilizadores/apagar-registos', {
        usuario: utilizadorApagar,
      });
      setMsg(
        `Removidos ${data.data.linhas_removidas.toLocaleString('pt-MZ')} registos do utilizador "${data.data.usuario}".`
      );
      setUtilizadorApagar('');
      await carregarUtilizadores();
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro ao apagar registos');
    } finally {
      setAApagar(false);
    }
  }

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
    <div className="page-content max-w-5xl">
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

      <section className="app-card space-y-3">
        <h2 className="text-white font-medium text-sm hud-section-title">Apagar registos por utilizador</h2>
        <p className="text-xs text-slate-500">
          Lista todos os utilizadores com dados importados no PaperCut. Pode remover todos os registos de um
          utilizador (útil para corrigir duplicados ou importações erradas). Não afecta utilizadores de login do
          sistema.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="search"
            className="input-imperial flex-1 min-w-[12rem] py-1.5"
            placeholder="Filtrar por nome…"
            value={filtroUtilizador}
            onChange={(e) => setFiltroUtilizador(e.target.value)}
          />
          <button
            type="button"
            className="btn-imperial-outline text-sm py-1.5 px-3"
            onClick={carregarUtilizadores}
            disabled={aCarregarUtilizadores}
          >
            {aCarregarUtilizadores ? 'A actualizar…' : 'Actualizar lista'}
          </button>
        </div>
        {utilizadores.length > 0 ? (
          <div className="overflow-x-auto rounded border border-surface-border max-h-56 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-surface-elevated text-slate-400">
                <tr>
                  <th className="px-2 py-2 font-medium">Utilizador</th>
                  <th className="px-2 py-2 font-medium text-right">Registos</th>
                  <th className="px-2 py-2 font-medium text-right">Folhas</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 divide-y divide-surface-border">
                {utilizadoresFiltrados.map((u) => (
                  <tr
                    key={u.usuario}
                    className={
                      utilizadorApagar === u.usuario ? 'bg-imperial-500/10' : 'hover:bg-white/5'
                    }
                  >
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="text-left hover:text-white underline-offset-2 hover:underline"
                        onClick={() => setUtilizadorApagar(u.usuario)}
                      >
                        {u.usuario}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{u.total_linhas.toLocaleString('pt-MZ')}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {Math.round(u.total_folhas).toLocaleString('pt-MZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {aCarregarUtilizadores ? 'A carregar…' : 'Nenhum utilizador PaperCut na base de dados.'}
          </p>
        )}
        {utilizadoresFiltrados.length === 0 && utilizadores.length > 0 && (
          <p className="text-xs text-slate-500">Nenhum utilizador corresponde ao filtro.</p>
        )}
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-1 text-xs text-slate-500 flex-1 min-w-[14rem]">
            Utilizador a apagar
            <select
              className="select-imperial"
              value={utilizadorApagar}
              onChange={(e) => setUtilizadorApagar(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {utilizadores.map((u) => (
                <option key={u.usuario} value={u.usuario}>
                  {u.usuario} ({u.total_linhas} registos)
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-imperial-outline text-sm py-1.5 px-3 border-red-800/60 text-red-300 hover:bg-red-950/40"
            onClick={apagarRegistosUtilizador}
            disabled={!utilizadorApagar || aApagar}
          >
            {aApagar ? 'A apagar…' : 'Apagar todos os registos'}
          </button>
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
