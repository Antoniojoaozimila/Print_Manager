import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';

const labelClass = 'label-imperial';
const inputClass = 'input-imperial';

const TIPO_LABEL = {
  papel_a4: 'Papel A4',
  envelope: 'Envelope',
  toner: 'Toner',
  agrafos: 'Agrafos',
};

const DOC_TIPOS = [
  { key: 'cotacao', label: 'Cotações' },
  { key: 'fatura', label: 'Faturas' },
  { key: 'recibo', label: 'Recibos' },
  { key: 'comprovativo_pagamento', label: 'Comprovativos de pagamento' },
];

const DOC_TIPO_LABEL = Object.fromEntries(DOC_TIPOS.map((d) => [d.key, d.label]));

function nomeDoContentDisposition(headers, fallback) {
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

function anexosPorTipo(anexos = []) {
  const g = Object.fromEntries(DOC_TIPOS.map((d) => [d.key, []]));
  for (const a of anexos) {
    if (g[a.documento_tipo]) g[a.documento_tipo].push(a);
  }
  return g;
}

const anexosVazios = () =>
  Object.fromEntries(DOC_TIPOS.map((d) => [d.key, []]));

export default function ConsumiveisGestaoPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'admin';

  const [catalogos, setCatalogos] = useState({ provincias: [], departamentos: [] });
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({ tipo: '', provinciaId: '', search: '' });
  const [msg, setMsg] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detalheId, setDetalheId] = useState(null);
  const [anexosNovos, setAnexosNovos] = useState(anexosVazios);
  const [mapaDe, setMapaDe] = useState('');
  const [mapaAte, setMapaAte] = useState('');

  const anexoInputsRef = useRef({});

  const { register, handleSubmit, reset, setValue } = useForm();

  async function carregarCatalogos() {
    const { data } = await api.get('/consumiveis/catalogos');
    setCatalogos(data.data);
  }

  async function carregarLista() {
    const params = { page, limit: 15, ...filtros };
    Object.keys(params).forEach((k) => {
      if (params[k] === '') delete params[k];
    });
    const { data } = await api.get('/consumiveis/registos', { params });
    setLista(data.data);
    setTotal(data.meta?.total || 0);
  }

  useEffect(() => {
    carregarCatalogos();
  }, []);

  useEffect(() => {
    carregarLista();
  }, [page, filtros.tipo, filtros.provinciaId, filtros.search]);

  function fecharFormulario() {
    setFormAberto(false);
    setEditId(null);
    setAnexosNovos(anexosVazios());
    reset();
  }

  function abrirNovo() {
    setEditId(null);
    setAnexosNovos(anexosVazios());
    reset({
      provincia_id: '',
      departamento_id: '',
      tipo: '',
      quantidade: '',
      preco_unitario: '',
      data_aquisicao: '',
      data_termino: '',
      observacoes: '',
    });
    setFormAberto(true);
  }

  function abrirEdicao(r) {
    setEditId(r.id);
    setAnexosNovos(anexosVazios());
    setValue('provincia_id', r.provincia_id);
    setValue('departamento_id', r.departamento_id || '');
    setValue('tipo', r.tipo);
    setValue('quantidade', r.quantidade);
    setValue('preco_unitario', r.preco_unitario);
    setValue('data_aquisicao', r.data_aquisicao?.slice(0, 10));
    setValue('data_termino', r.data_termino?.slice(0, 10) || '');
    setValue('observacoes', r.observacoes || '');
    setFormAberto(true);
    setDetalheId(r.id);
  }

  function onFicheirosTipo(tipoKey, fileList) {
    const files = Array.from(fileList || []);
    setAnexosNovos((prev) => ({ ...prev, [tipoKey]: [...(prev[tipoKey] || []), ...files] }));
  }

  function removerFicheiroPendente(tipoKey, index) {
    setAnexosNovos((prev) => ({
      ...prev,
      [tipoKey]: prev[tipoKey].filter((_, i) => i !== index),
    }));
  }

  async function enviarAnexosPorTipo(registoId, buckets) {
    for (const { key } of DOC_TIPOS) {
      const files = buckets[key] || [];
      if (!files.length) continue;
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      fd.append('documento_tipos', JSON.stringify(files.map(() => key)));
      await api.post(`/consumiveis/registos/${registoId}/anexos`, fd);
    }
  }

  async function enviarAnexosDoInput(registoId, tipoKey) {
    const input = anexoInputsRef.current[`${registoId}-${tipoKey}`];
    if (!input?.files?.length) return;
    const fd = new FormData();
    const files = Array.from(input.files);
    files.forEach((f) => fd.append('files', f));
    fd.append('documento_tipos', JSON.stringify(files.map(() => tipoKey)));
    await api.post(`/consumiveis/registos/${registoId}/anexos`, fd);
    input.value = '';
  }

  async function onSubmit(values) {
    setMsg('');
    try {
      const payload = {
        ...values,
        quantidade: Number(values.quantidade),
        preco_unitario: Number(values.preco_unitario),
        data_termino: values.data_termino || null,
        departamento_id: values.departamento_id || null,
      };

      let registoId = editId;
      if (editId) {
        await api.patch(`/consumiveis/registos/${editId}`, payload);
        setMsg('Registo actualizado.');
      } else {
        const { data } = await api.post('/consumiveis/registos', payload);
        registoId = data.data.id;
        setMsg('Consumível registado.');
      }

      await enviarAnexosPorTipo(registoId, anexosNovos);
      fecharFormulario();
      await carregarLista();
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro ao guardar.');
    }
  }

  async function remover(id) {
    if (!window.confirm('Remover este consumível e todos os anexos?')) return;
    await api.delete(`/consumiveis/registos/${id}`);
    if (detalheId === id) setDetalheId(null);
    await carregarLista();
    setMsg('Registo removido.');
  }

  async function descarregarAnexo(registoId, anexoId, nomeOriginal) {
    try {
      const r = await api.get(`/consumiveis/registos/${registoId}/anexos/${anexoId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeOriginal || 'documento';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro ao descarregar.');
    }
  }

  async function apagarAnexo(registoId, anexoId) {
    if (!window.confirm('Remover este documento?')) return;
    await api.delete(`/consumiveis/registos/${registoId}/anexos/${anexoId}`);
    await carregarLista();
    setMsg('Documento removido.');
  }

  async function adicionarDocumentos(registoId) {
    setMsg('');
    try {
      let enviou = false;
      for (const { key } of DOC_TIPOS) {
        const input = anexoInputsRef.current[`${registoId}-${key}`];
        if (input?.files?.length) {
          await enviarAnexosDoInput(registoId, key);
          enviou = true;
        }
      }
      if (!enviou) {
        setMsg('Seleccione ficheiros numa das categorias.');
        return;
      }
      await carregarLista();
      setMsg('Documentos adicionados.');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro ao enviar documentos.');
    }
  }

  async function exportarMapaCompleto(fmt = 'xlsx') {
    setMsg('');
    try {
      if ((mapaDe && !mapaAte) || (!mapaDe && mapaAte)) {
        setMsg('Preencha as duas datas ou deixe ambas em branco.');
        return;
      }
      const params = { formato: fmt };
      if (mapaDe && mapaAte) {
        params.de = mapaDe;
        params.ate = mapaAte;
      }
      const r = await api.get('/consumiveis/relatorios/mapa-completo/export', {
        params,
        responseType: 'blob',
      });
      const ext = fmt === 'pdf' ? 'pdf' : fmt === 'docx' ? 'docx' : 'xlsx';
      const nome = nomeDoContentDisposition(r.headers, `imperial-consumiveis-mapa-completo.${ext}`);
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Mapa descarregado: ${nome}`);
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro ao exportar mapa.');
    }
  }

  const registoDetalhe = detalheId ? lista.find((r) => r.id === detalheId) : null;

  return (
    <div className="page-content max-w-5xl">
      <PageHeader
        badge="Gestão"
        title="Consumíveis de escritório"
        subtitle="Registe compras por balcão, anexe documentos e exporte o mapa completo."
        actions={
          isAdmin ? (
            <button type="button" onClick={abrirNovo} className="btn-imperial">
              + Novo consumível
            </button>
          ) : null
        }
      />

      {msg && <p className="alert-imperial-warning">{msg}</p>}

      <section className="app-card space-y-3">
        <h2 className="text-white font-medium text-sm hud-section-title">Mapa de consumíveis</h2>
        <p className="text-xs text-slate-400">
          Descarrega todos os registos (com resumo por província e listagem de documentos por tipo). Filtro opcional por
          data de aquisição.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={labelClass}>De (opcional)</label>
            <input type="date" className={inputClass} value={mapaDe} onChange={(e) => setMapaDe(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Até (opcional)</label>
            <input type="date" className={inputClass} value={mapaAte} onChange={(e) => setMapaAte(e.target.value)} />
          </div>
          <button type="button" onClick={() => exportarMapaCompleto('xlsx')} className="btn-imperial">
            Descarregar Excel
          </button>
          <button type="button" onClick={() => exportarMapaCompleto('pdf')} className="btn-imperial-outline">
            PDF
          </button>
        </div>
      </section>

      <Modal
        open={formAberto && isAdmin}
        onClose={fecharFormulario}
        title={editId ? 'Editar consumível' : 'Novo consumível'}
        wide
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-xs text-slate-500">
            Papel A4: quantidade em <strong className="text-imperial-300">caixas</strong> (1 caixa = 5 resmas = 2 500
            folhas). Estes preços alimentam os relatórios PaperCut.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Província / distrito *</label>
              <select className={inputClass} {...register('provincia_id', { required: true })}>
                <option value="">Seleccione…</option>
                {catalogos.provincias?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Departamento</label>
              <select className={inputClass} {...register('departamento_id')}>
                <option value="">—</option>
                {catalogos.departamentos?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo *</label>
              <select className={inputClass} {...register('tipo', { required: true })}>
                <option value="">Seleccione…</option>
                <option value="papel_a4">Papel A4 (caixas)</option>
                <option value="envelope">Envelope</option>
                <option value="toner">Toner</option>
                <option value="agrafos">Agrafos</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Quantidade *</label>
              <input type="number" step="0.01" className={inputClass} {...register('quantidade', { required: true })} />
            </div>
            <div>
              <label className={labelClass}>Preço unitário (MZN) *</label>
              <input
                type="number"
                step="0.0001"
                className={inputClass}
                {...register('preco_unitario', { required: true })}
              />
            </div>
            <div>
              <label className={labelClass}>Data de aquisição *</label>
              <input type="date" className={inputClass} {...register('data_aquisicao', { required: true })} />
            </div>
            <div>
              <label className={labelClass}>Data de término</label>
              <input type="date" className={inputClass} {...register('data_termino')} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Observações</label>
              <textarea className={inputClass} rows={2} {...register('observacoes')} />
            </div>
          </div>

          <div className="border-t border-surface-border pt-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Documentos {editId ? '(adicionar novos)' : '(opcional no registo)'}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {DOC_TIPOS.map(({ key, label }) => (
                <div key={key} className="app-card-nested space-y-2">
                  <p className="text-sm text-slate-300">{label}</p>
                  <input
                    type="file"
                    multiple
                    className="text-xs text-slate-400 w-full"
                    onChange={(e) => onFicheirosTipo(key, e.target.files)}
                  />
                  {(anexosNovos[key] || []).map((f, i) => (
                    <div key={`${key}-${i}`} className="flex justify-between text-xs text-slate-500">
                      <span className="truncate">{f.name}</span>
                      <button type="button" className="text-red-400 ml-2" onClick={() => removerFicheiroPendente(key, i)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-imperial">
              {editId ? 'Guardar' : 'Registar'}
            </button>
            <button type="button" onClick={fecharFormulario} className="btn-imperial-outline">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className={labelClass}>Tipo</label>
          <select
            className="select-imperial min-w-[9rem]"
            value={filtros.tipo}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="papel_a4">Papel A4</option>
            <option value="envelope">Envelope</option>
            <option value="toner">Toner</option>
            <option value="agrafos">Agrafos</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Província</label>
          <select
            className="select-imperial min-w-[9rem]"
            value={filtros.provinciaId}
            onChange={(e) => setFiltros((f) => ({ ...f, provinciaId: e.target.value }))}
          >
            <option value="">Todas</option>
            {catalogos.provincias?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className={labelClass}>Pesquisar</label>
          <input
            className="input-imperial"
            placeholder="Observações…"
            value={filtros.search}
            onChange={(e) => setFiltros((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </div>

      <div className="app-table-wrap">
        <table className="table-imperial">
          <thead>
            <tr>
              <th>Província</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Total MZN</th>
              <th>Aquisição</th>
              <th>Docs</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Nenhum consumível registado.
                </td>
              </tr>
            ) : (
              lista.map((r) => (
                <tr key={r.id}>
                  <td>{r.provincia?.nome}</td>
                  <td className="text-white">{TIPO_LABEL[r.tipo] || r.tipo}</td>
                  <td className="font-mono">{r.quantidade}</td>
                  <td className="font-mono">{Number(r.preco_total).toFixed(2)}</td>
                  <td className="text-slate-400">{r.data_aquisicao}</td>
                  <td>
                    <button
                      type="button"
                      className="text-xs text-link"
                      onClick={() => setDetalheId((id) => (id === r.id ? null : r.id))}
                    >
                      {(r.anexos?.length || 0) === 0 ? 'Sem docs' : `${r.anexos.length} doc(s)`}
                    </button>
                  </td>
                  <td className="text-right whitespace-nowrap space-x-2">
                    {isAdmin && (
                      <>
                        <button type="button" className="text-xs text-slate-300 hover:text-white" onClick={() => abrirEdicao(r)}>
                          Editar
                        </button>
                        <button type="button" className="text-xs text-red-400" onClick={() => remover(r.id)}>
                          Remover
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-sm text-slate-500">
        <span>{total} registo(s)</span>
        <div className="space-x-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-link disabled:opacity-30">
            Anterior
          </button>
          <button
            type="button"
            disabled={page * 15 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="text-link disabled:opacity-30"
          >
            Seguinte
          </button>
        </div>
      </div>

      {registoDetalhe && (
        <section className="app-card space-y-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-white font-medium text-sm">
              Documentos — {registoDetalhe.provincia?.nome} · {TIPO_LABEL[registoDetalhe.tipo]}
            </h2>
            <button type="button" className="text-xs text-slate-500" onClick={() => setDetalheId(null)}>
              Fechar
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {DOC_TIPOS.map(({ key, label }) => {
              const docs = anexosPorTipo(registoDetalhe.anexos)[key];
              return (
                <div key={key} className="app-card-nested space-y-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
                  {docs.length === 0 ? (
                    <p className="text-xs text-slate-600">Nenhum ficheiro.</p>
                  ) : (
                    <ul className="space-y-1">
                      {docs.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-300 truncate max-w-[12rem]">{a.nome_original}</span>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => descarregarAnexo(registoDetalhe.id, a.id, a.nome_original)}
                          >
                            Descarregar
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="text-red-400"
                              onClick={() => apagarAnexo(registoDetalhe.id, a.id)}
                            >
                              Apagar
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isAdmin && (
                    <input
                      type="file"
                      multiple
                      className="text-xs text-slate-500 w-full mt-1"
                      ref={(el) => {
                        anexoInputsRef.current[`${registoDetalhe.id}-${key}`] = el;
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => adicionarDocumentos(registoDetalhe.id)}
              className="btn-imperial text-xs py-1.5 px-3"
            >
              Adicionar documentos seleccionados
            </button>
          )}
        </section>
      )}
    </div>
  );
}
