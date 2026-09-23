import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { hojeMaputo, nomeFicheiroDownload, estadoBadgeClass } from '../lib/tickets';

const labelClass = 'label-imperial';
const inputClass = 'input-imperial';

function tecnicosLista(catalogos, userNome) {
  const set = new Set([...(catalogos.tecnicos || []), userNome].filter(Boolean));
  return [...set];
}

export default function TicketsProjectosPage() {
  const user = useAuthStore((s) => s.user);
  const [catalogos, setCatalogos] = useState({ tecnicos: [], estados: [], fases: [] });
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState(hojeMaputo());
  const [filtros, setFiltros] = useState({ responsavel: '', estado: '', search: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const carregarCatalogos = useCallback(async () => {
    const { data: res } = await api.get('/tickets/catalogos');
    setCatalogos(res.data);
  }, []);

  async function carregarLista() {
    const params = { data, ...filtros };
    Object.keys(params).forEach((k) => {
      if (params[k] === '') delete params[k];
    });
    const { data: res } = await api.get('/tickets/projectos', { params });
    setLista(res.data);
    setTotal(res.meta?.total || 0);
  }

  useEffect(() => {
    carregarCatalogos();
  }, [carregarCatalogos]);

  useEffect(() => {
    carregarLista();
  }, [data, filtros.responsavel, filtros.estado, filtros.search]);

  function fecharFormulario() {
    setFormAberto(false);
    setEditId(null);
    reset();
  }

  function abrirNovo() {
    setEditId(null);
    reset({
      data: hojeMaputo(),
      responsavel: user?.nome || '',
      projecto_sistema: '',
      tarefa: '',
      data_atribuicao: hojeMaputo(),
      prazo: '',
      fase_actual: 'Análise',
      percentagem_conclusao: 0,
      alteracoes_solicitadas: '',
      data_alteracao: '',
      descricao_alteracao: '',
      accao_realizada: '',
      estado: 'Pendente',
      observacoes: '',
    });
    setFormAberto(true);
  }

  function abrirEdicao(r) {
    setEditId(r.id);
    reset({
      data: r.data,
      responsavel: r.responsavel,
      projecto_sistema: r.projecto_sistema,
      tarefa: r.tarefa,
      data_atribuicao: r.data_atribuicao,
      prazo: r.prazo || '',
      fase_actual: r.fase_actual || '',
      percentagem_conclusao: r.percentagem_conclusao ?? 0,
      alteracoes_solicitadas: r.alteracoes_solicitadas || '',
      data_alteracao: r.data_alteracao || '',
      descricao_alteracao: r.descricao_alteracao || '',
      accao_realizada: r.accao_realizada || '',
      estado: r.estado,
      observacoes: r.observacoes || '',
    });
    setFormAberto(true);
  }

  async function onSubmit(values) {
    setErr('');
    setMsg('');
    try {
      if (editId) await api.patch(`/tickets/projectos/${editId}`, values);
      else await api.post('/tickets/projectos', values);
      setMsg(editId ? 'Tarefa actualizada.' : 'Projecto/tarefa registado. O número e a data foram atribuídos automaticamente.');
      fecharFormulario();
      carregarLista();
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao guardar');
    }
  }

  async function apagarLinha(r) {
    const ok = window.confirm(
      `Apagar o projecto/tarefa nº ${r.numero}${r.projecto_sistema ? ` (${r.projecto_sistema})` : ''}?\n\nEsta acção não pode ser anulada.`
    );
    if (!ok) return;
    setErr('');
    try {
      await api.delete(`/tickets/projectos/${r.id}`);
      if (editId === r.id) fecharFormulario();
      setMsg(`Projecto/tarefa nº ${r.numero} apagado.`);
      carregarLista();
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao apagar');
    }
  }

  async function baixarExcel() {
    try {
      const res = await api.get('/tickets/relatorio-dia', { params: { data }, responseType: 'blob' });
      const nome = nomeFicheiroDownload(res.headers, `matriz-controlo-diario-ti-${data}.xlsx`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.error || 'Não foi possível gerar o Excel');
    }
  }

  const tecnicos = tecnicosLista(catalogos, user?.nome);

  return (
    <div className="page-content space-y-6">
      <PageHeader
        badge="Tickets TI"
        title="Projectos e tarefas"
        subtitle="Registe atribuição, prazo, fase, percentagem de conclusão e alterações. Nº e data são automáticos."
        actions={
          <>
            <button type="button" className="btn-imperial-outline text-xs" onClick={baixarExcel}>
              Excel do dia
            </button>
            <button type="button" className="btn-imperial text-xs" onClick={abrirNovo}>
              Nova tarefa
            </button>
          </>
        }
      />

      {err && <p className="alert-imperial-warning">{err}</p>}
      {msg && <p className="alert-imperial-success">{msg}</p>}

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className={labelClass}>Dia</label>
          <input type="date" className={inputClass} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Responsável</label>
          <select
            className="select-imperial min-w-[9rem]"
            value={filtros.responsavel}
            onChange={(e) => setFiltros((f) => ({ ...f, responsavel: e.target.value }))}
          >
            <option value="">Todos</option>
            {tecnicos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Estado</label>
          <select
            className="select-imperial min-w-[9rem]"
            value={filtros.estado}
            onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
          >
            <option value="">Todos</option>
            {(catalogos.estados || []).map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[12rem]">
          <label className={labelClass}>Pesquisar</label>
          <input
            className={inputClass}
            placeholder="Projecto ou tarefa…"
            value={filtros.search}
            onChange={(e) => setFiltros((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">{total} registo(s) neste dia</p>

      <div className="app-table-wrap">
        <table className="table-imperial">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Responsável</th>
              <th>Projecto / sistema</th>
              <th>Tarefa</th>
              <th>Prazo</th>
              <th>Fase</th>
              <th>%</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id}>
                <td>{r.numero}</td>
                <td>{r.responsavel}</td>
                <td>{r.projecto_sistema}</td>
                <td className="max-w-xs truncate">{r.tarefa}</td>
                <td>{r.prazo || '—'}</td>
                <td>{r.fase_actual || '—'}</td>
                <td>{r.percentagem_conclusao}%</td>
                <td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border ${estadoBadgeClass(r.estado)}`}>
                    {r.estado}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  <button type="button" className="btn-imperial-ghost text-xs" onClick={() => abrirEdicao(r)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-imperial-ghost text-xs text-red-400"
                    onClick={() => apagarLinha(r)}
                  >
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={9} className="text-slate-500">
                  Sem projectos/tarefas neste dia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={formAberto}
        onClose={fecharFormulario}
        title={editId ? 'Editar projecto / tarefa' : 'Novo projecto / tarefa'}
        wide
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Data *</label>
              <input type="date" className={inputClass} {...register('data', { required: true })} />
            </div>
            <div>
              <label className={labelClass}>Responsável *</label>
              <select className="select-imperial" {...register('responsavel', { required: true })}>
                {tecnicos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Projecto / sistema *</label>
              <input className={inputClass} {...register('projecto_sistema', { required: true })} />
            </div>
            <div>
              <label className={labelClass}>Data de atribuição</label>
              <input type="date" className={inputClass} {...register('data_atribuicao')} />
            </div>
            <div>
              <label className={labelClass}>Prazo</label>
              <input type="date" className={inputClass} {...register('prazo')} />
            </div>
            <div>
              <label className={labelClass}>Fase actual</label>
              <select className="select-imperial" {...register('fase_actual')}>
                <option value="">Seleccione…</option>
                {(catalogos.fases || []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>% conclusão</label>
              <input type="number" min={0} max={100} className={inputClass} {...register('percentagem_conclusao')} />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select className="select-imperial" {...register('estado')}>
                {(catalogos.estados || []).map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Data da alteração</label>
              <input type="date" className={inputClass} {...register('data_alteracao')} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Tarefa atribuída *</label>
              <textarea className={inputClass} rows={2} {...register('tarefa', { required: true })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Alterações solicitadas</label>
              <textarea className={inputClass} rows={2} {...register('alteracoes_solicitadas')} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Descrição da alteração</label>
              <textarea className={inputClass} rows={2} {...register('descricao_alteracao')} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Acção realizada</label>
              <textarea className={inputClass} rows={2} {...register('accao_realizada')} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Observações</label>
              <textarea className={inputClass} rows={2} {...register('observacoes')} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-imperial">
              Guardar
            </button>
            <button type="button" className="btn-imperial-outline" onClick={fecharFormulario}>
              Cancelar
            </button>
            {editId && (
              <button
                type="button"
                className="btn-imperial-ghost text-red-400"
                onClick={() => {
                  const actual = lista.find((x) => x.id === editId);
                  if (actual) apagarLinha(actual);
                }}
              >
                Apagar registo
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
