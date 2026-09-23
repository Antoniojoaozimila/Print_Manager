import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import {
  hojeMaputo,
  horaMaputo,
  horaCurta,
  duracaoLabel,
  nomeFicheiroDownload,
  estadoBadgeClass,
} from '../lib/tickets';

const labelClass = 'label-imperial';
const inputClass = 'input-imperial';

function tecnicosLista(catalogos, userNome) {
  const set = new Set([...(catalogos.tecnicos || []), userNome].filter(Boolean));
  return [...set];
}

export default function TicketsAssistenciaPage() {
  const user = useAuthStore((s) => s.user);
  const [catalogos, setCatalogos] = useState({
    tecnicos: [],
    tipos_solicitacao: [],
    estados: [],
    meios: [],
    provincias: [],
    departamentos: [],
  });
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState(hojeMaputo());
  const [filtros, setFiltros] = useState({ tecnico: '', estado: '', search: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [horaInicioAuto, setHoraInicioAuto] = useState('');

  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const urgencia = watch('urgencia');
  const horaInicio = watch('hora_inicio');
  const horaFim = watch('hora_fim');

  const carregarCatalogos = useCallback(async () => {
    const { data: res } = await api.get('/tickets/catalogos');
    setCatalogos(res.data);
  }, []);

  async function carregarLista() {
    const params = { data, ...filtros };
    Object.keys(params).forEach((k) => {
      if (params[k] === '') delete params[k];
    });
    const { data: res } = await api.get('/tickets/assistencias', { params });
    setLista(res.data);
    setTotal(res.meta?.total || 0);
  }

  useEffect(() => {
    carregarCatalogos();
  }, [carregarCatalogos]);

  useEffect(() => {
    carregarLista();
  }, [data, filtros.tecnico, filtros.estado, filtros.search]);

  function fecharFormulario() {
    setFormAberto(false);
    setEditId(null);
    reset();
  }

  function abrirNovo() {
    const agoraHora = horaMaputo().slice(0, 5);
    setEditId(null);
    setHoraInicioAuto(agoraHora);
    reset({
      data: hojeMaputo(),
      tecnico: user?.nome || '',
      hora_inicio: agoraHora,
      hora_fim: '',
      departamento: '',
      provincia: '',
      colaborador_assistido: '',
      tipo_solicitacao: '',
      problema: '',
      resolucao: '',
      estado: 'Em Progresso',
      urgencia: 'Não',
      descricao_urgencia: '',
      num_chamadas: 1,
      meio_solicitacao: '',
      observacoes: '',
    });
    setFormAberto(true);
  }

  function abrirEdicao(r) {
    setEditId(r.id);
    setHoraInicioAuto(horaCurta(r.hora_inicio));
    reset({
      data: r.data,
      tecnico: r.tecnico,
      hora_inicio: horaCurta(r.hora_inicio),
      hora_fim: r.hora_fim ? horaCurta(r.hora_fim) : '',
      departamento: r.departamento || '',
      provincia: r.provincia || '',
      colaborador_assistido: r.colaborador_assistido || '',
      tipo_solicitacao: r.tipo_solicitacao,
      problema: r.problema,
      resolucao: r.resolucao || '',
      estado: r.estado,
      urgencia: r.urgencia ? 'Sim' : 'Não',
      descricao_urgencia: r.descricao_urgencia || '',
      num_chamadas: r.num_chamadas || 1,
      meio_solicitacao: r.meio_solicitacao || '',
      observacoes: r.observacoes || '',
    });
    setFormAberto(true);
  }

  async function onSubmit(values) {
    setErr('');
    setMsg('');
    try {
      const payload = { ...values };
      if (!payload.hora_inicio) payload.hora_inicio = horaInicioAuto || horaMaputo();
      if (editId) await api.patch(`/tickets/assistencias/${editId}`, payload);
      else await api.post('/tickets/assistencias', payload);
      setMsg(editId ? 'Assistência actualizada.' : 'Assistência registada. Horários calculados automaticamente.');
      fecharFormulario();
      carregarLista();
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao guardar');
    }
  }

  async function guardarEConcluir(values) {
    setErr('');
    try {
      const payload = { ...values, estado: 'Concluído' };
      if (!payload.hora_inicio) payload.hora_inicio = horaInicioAuto || horaMaputo();
      if (editId) {
        await api.patch(`/tickets/assistencias/${editId}`, payload);
        await api.post(`/tickets/assistencias/${editId}/concluir`);
      } else {
        const { data: res } = await api.post('/tickets/assistencias', payload);
        if (res.data?.id) await api.post(`/tickets/assistencias/${res.data.id}/concluir`);
      }
      setMsg('Assistência concluída. Hora de fim e duração preenchidas automaticamente.');
      fecharFormulario();
      carregarLista();
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao concluir');
    }
  }

  async function concluirLinha(id) {
    setErr('');
    try {
      await api.post(`/tickets/assistencias/${id}/concluir`);
      setMsg('Assistência concluída. Duração calculada automaticamente.');
      carregarLista();
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao concluir');
    }
  }

  async function apagarLinha(r) {
    const ok = window.confirm(
      `Apagar a assistência nº ${r.numero}${r.colaborador_assistido ? ` (${r.colaborador_assistido})` : ''}?\n\nEsta acção não pode ser anulada.`
    );
    if (!ok) return;
    setErr('');
    try {
      await api.delete(`/tickets/assistencias/${r.id}`);
      if (editId === r.id) fecharFormulario();
      setMsg(`Assistência nº ${r.numero} apagada.`);
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
        title="Assistência diária"
        subtitle="Cada assistência ocupa uma linha. Nº, data, hora de início/fim e duração são automáticos."
        actions={
          <>
            <button type="button" className="btn-imperial-outline text-xs" onClick={baixarExcel}>
              Excel do dia
            </button>
            <button type="button" className="btn-imperial text-xs" onClick={abrirNovo}>
              Nova assistência
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
          <label className={labelClass}>Técnico</label>
          <select
            className="select-imperial min-w-[9rem]"
            value={filtros.tecnico}
            onChange={(e) => setFiltros((f) => ({ ...f, tecnico: e.target.value }))}
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
            placeholder="Colaborador, problema, departamento…"
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
              <th>Início</th>
              <th>Fim</th>
              <th>Duração</th>
              <th>Técnico</th>
              <th>Departamento</th>
              <th>Colaborador</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id}>
                <td>{r.numero}</td>
                <td>{horaCurta(r.hora_inicio)}</td>
                <td>{horaCurta(r.hora_fim)}</td>
                <td>{duracaoLabel(r.duracao_min)}</td>
                <td>{r.tecnico}</td>
                <td>{r.departamento || '—'}</td>
                <td>{r.colaborador_assistido || '—'}</td>
                <td>{r.tipo_solicitacao}</td>
                <td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border ${estadoBadgeClass(r.estado)}`}>
                    {r.estado}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  <button type="button" className="btn-imperial-ghost text-xs" onClick={() => abrirEdicao(r)}>
                    Editar
                  </button>
                  {r.estado !== 'Concluído' && r.estado !== 'Cancelado' && (
                    <button type="button" className="btn-imperial-ghost text-xs" onClick={() => concluirLinha(r.id)}>
                      Concluir
                    </button>
                  )}
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
                <td colSpan={10} className="text-slate-500">
                  Sem assistências neste dia. Clique em «Nova assistência» para lançar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={formAberto}
        onClose={fecharFormulario}
        title={editId ? 'Editar assistência' : 'Nova assistência'}
        wide
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <p className="text-xs text-slate-500">
            A hora de início foi registada automaticamente às <strong className="text-imperial-300">{horaInicioAuto || '—'}</strong>.
            A duração é calculada quando a assistência é concluída.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Data *</label>
              <input type="date" className={inputClass} {...register('data', { required: true })} />
            </div>
            <div>
              <label className={labelClass}>Técnico *</label>
              <select className="select-imperial" {...register('tecnico', { required: true })}>
                {tecnicos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Hora início (automático)</label>
              <input className={inputClass} readOnly {...register('hora_inicio')} />
            </div>
            <div>
              <label className={labelClass}>Hora fim (automático)</label>
              <input className={inputClass} readOnly placeholder="Ao concluir" {...register('hora_fim')} />
            </div>
            <div>
              <label className={labelClass}>Duração</label>
              <input
                className={inputClass}
                readOnly
                value={horaInicio && horaFim ? 'Calculada no servidor' : 'Preenchida ao concluir'}
                onChange={() => {}}
              />
            </div>
            <div>
              <label className={labelClass}>Departamento</label>
              <input className={inputClass} list="dept-list" {...register('departamento')} />
              <datalist id="dept-list">
                {(catalogos.departamentos || []).map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Província</label>
              <select className="select-imperial" {...register('provincia')}>
                <option value="">Seleccione…</option>
                {(catalogos.provincias || []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Colaborador assistido</label>
              <input className={inputClass} {...register('colaborador_assistido')} />
            </div>
            <div>
              <label className={labelClass}>Tipo de solicitação *</label>
              <select className="select-imperial" {...register('tipo_solicitacao', { required: true })}>
                <option value="">Seleccione…</option>
                {(catalogos.tipos_solicitacao || []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
              <label className={labelClass}>Urgência / interrupção</label>
              <select
                className="select-imperial"
                {...register('urgencia')}
                onChange={(e) => setValue('urgencia', e.target.value)}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Nº de chamadas</label>
              <input type="number" min={1} className={inputClass} {...register('num_chamadas')} />
            </div>
            <div>
              <label className={labelClass}>Meio da solicitação</label>
              <select className="select-imperial" {...register('meio_solicitacao')}>
                <option value="">Seleccione…</option>
                {(catalogos.meios || []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Problema / solicitação reportada *</label>
              <textarea className={inputClass} rows={2} {...register('problema', { required: true })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Resolução / acção realizada</label>
              <textarea className={inputClass} rows={2} {...register('resolucao')} />
            </div>
            {urgencia === 'Sim' && (
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass}>Descrição da urgência</label>
                <textarea className={inputClass} rows={2} {...register('descricao_urgencia')} />
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Observações</label>
              <textarea className={inputClass} rows={2} {...register('observacoes')} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-imperial">
              Guardar
            </button>
            <button type="button" className="btn-imperial-outline" onClick={handleSubmit(guardarEConcluir)}>
              Guardar e concluir
            </button>
            <button type="button" className="btn-imperial-ghost" onClick={fecharFormulario}>
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
