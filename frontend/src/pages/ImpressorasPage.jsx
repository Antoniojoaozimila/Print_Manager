import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { io } from 'socket.io-client';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import PageHeader from '../components/ui/PageHeader';

function portaLabel(p) {
  if (p === 9100) return '9100 (JetDirect)';
  if (p === 631) return '631 (IPP)';
  if (p === 515) return '515 (LPR)';
  return String(p);
}

export default function ImpressorasPage() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const [lista, setLista] = useState([]);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [toast, setToast] = useState('');
  const [erroScan, setErroScan] = useState('');

  const [prefixoRede, setPrefixoRede] = useState('192.168.110');
  const [hostInicio, setHostInicio] = useState(1);
  const [hostFim, setHostFim] = useState(254);
  const [tipoNovoRede, setTipoNovoRede] = useState('balcao');
  const [aEscanear, setAEscanear] = useState(false);
  const [hostsDescobertos, setHostsDescobertos] = useState([]);
  const [nomesPendentes, setNomesPendentes] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { tipo: 'central', ativo: true },
  });

  const ipsCadastrados = useMemo(() => new Set((lista || []).map((p) => p.ip_rede).filter(Boolean)), [lista]);

  async function carregar() {
    const { data } = await api.get('/impressoras');
    setLista(data.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!token || role !== 'admin') return undefined;
    const socket = io({
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
    });
    socket.on('impressoras_sincronizadas', (payload) => {
      setToast(`Impressoras sincronizadas pelo coletor: ${payload.count}`);
      carregar();
      setTimeout(() => setToast(''), 5000);
    });
    socket.on('print_job_batch', () => {
      carregar();
    });
    return () => socket.disconnect();
  }, [token, role]);

  async function onCreate(values) {
    await api.post('/impressoras', {
      ...values,
      ativo: values.ativo !== false,
    });
    reset({ nome: '', localizacao: '', ip_rede: '', tipo: 'central', ativo: true });
    await carregar();
  }

  async function executarVarredura() {
    setErroScan('');
    setHostsDescobertos([]);
    setAEscanear(true);
    try {
      const { data } = await api.post(
        '/impressoras/descoberta-rede',
        {
          prefix: prefixoRede.trim(),
          hostInicio: Number(hostInicio),
          hostFim: Number(hostFim),
        },
        { timeout: 120000 }
      );
      const hosts = data.data?.hosts || [];
      setHostsDescobertos(hosts);
      const nomes = {};
      hosts.forEach((h) => {
        nomes[h.ip] = `Impressora ${h.ip}`;
      });
      setNomesPendentes(nomes);
      setToast(`Varredura concluída: ${hosts.length} equipamento(s) com portas de impressão.`);
      setTimeout(() => setToast(''), 6000);
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.message ||
        'Falha na varredura. Confirme que o servidor da API tem rota até esta sub-rede.';
      setErroScan(msg);
    } finally {
      setAEscanear(false);
    }
  }

  async function adicionarHostDaRede(host) {
    const nome = (nomesPendentes[host.ip] || `Impressora ${host.ip}`).trim();
    if (!nome) return;
    try {
      await api.post('/impressoras', {
        nome,
        ip_rede: host.ip,
        localizacao: `Rede ${prefixoRede}.x · portas ${host.portas.join(', ')}`,
        tipo: tipoNovoRede,
        ativo: true,
      });
      await carregar();
      setToast(`Impressora ${host.ip} adicionada.`);
      setTimeout(() => setToast(''), 4000);
    } catch (e) {
      setErroScan(e.response?.data?.error || 'Erro ao adicionar');
    }
  }

  function iniciarEdicao(p) {
    setEditingId(p.id);
    setEditDraft({
      nome: p.nome,
      localizacao: p.localizacao || '',
      ip_rede: p.ip_rede || '',
      tipo: p.tipo,
      ativo: p.ativo,
    });
  }

  async function guardarEdicao() {
    if (!editingId || !editDraft) return;
    setAGuardar(true);
    try {
      await api.patch(`/impressoras/${editingId}`, {
        nome: editDraft.nome,
        localizacao: editDraft.localizacao || null,
        tipo: editDraft.tipo,
        ativo: editDraft.ativo,
      });
      setEditingId(null);
      setEditDraft(null);
      await carregar();
      setToast('Impressora atualizada.');
      setTimeout(() => setToast(''), 4000);
    } catch (e) {
      setErroScan(e.response?.data?.error || 'Erro ao guardar');
    } finally {
      setAGuardar(false);
    }
  }

  async function removerImpressora(p) {
    const ok = window.confirm(
      `Remover a impressora "${p.nome}" da aplicação?\n\nOs registos de impressão antigos mantêm-se; a ligação a esta impressora será limpa.`
    );
    if (!ok) return;
    setErroScan('');
    try {
      await api.delete(`/impressoras/${p.id}`);
      if (editingId === p.id) {
        setEditingId(null);
        setEditDraft(null);
      }
      await carregar();
      setToast(`Impressora "${p.nome}" removida.`);
      setTimeout(() => setToast(''), 4000);
    } catch (e) {
      setErroScan(e.response?.data?.error || 'Erro ao remover');
    }
  }

  function online(hb) {
    if (!hb) return false;
    const t = new Date(hb).getTime();
    return Date.now() - t < 120000;
  }

  return (
    <div className="page-content max-w-4xl">
      <PageHeader
        badge="Infraestrutura"
        title="Impressoras"
        subtitle="Cadastro manual ou descoberta na rede local."
        actions={
          <button type="button" onClick={() => carregar()} className="btn-imperial-outline text-xs">
            Atualizar lista
          </button>
        }
      />

      {toast && (
        <p className="alert-imperial-success">
          {toast}
        </p>
      )}
      {erroScan && (
        <p className="alert-imperial-warning">{erroScan}</p>
      )}

      <section className="app-card space-y-4">
        <h2 className="text-white font-medium hud-section-title">Varredura na rede (LAN)</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Procura endereços na sub-rede com portas típicas de impressão (9100 JetDirect, 631 IPP, 515 LPR). O processo
          corre <strong className="text-slate-400">no servidor da API</strong> — este servidor tem de conseguir
          contactar <code className="text-slate-400">{prefixoRede}.x</code> (mesma LAN ou roteada). Depois escolhe
          quais quer registar na aplicação.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-slate-400">
            Rede (3 octetos)
            <input
              className="mt-1 block w-40 input-imperial"
              value={prefixoRede}
              onChange={(e) => setPrefixoRede(e.target.value)}
              placeholder="192.168.110"
            />
          </label>
          <label className="text-sm text-slate-400">
            Host de
            <input
              type="number"
              min={1}
              max={254}
              className="mt-1 block w-20 input-imperial"
              value={hostInicio}
              onChange={(e) => setHostInicio(Number(e.target.value))}
            />
          </label>
          <label className="text-sm text-slate-400">
            até
            <input
              type="number"
              min={1}
              max={254}
              className="mt-1 block w-20 input-imperial"
              value={hostFim}
              onChange={(e) => setHostFim(Number(e.target.value))}
            />
          </label>
          <label className="text-sm text-slate-400">
            Tipo ao adicionar
            <select
              className="mt-1 block select-imperial"
              value={tipoNovoRede}
              onChange={(e) => setTipoNovoRede(e.target.value)}
            >
              <option value="balcao">Balcão / filial</option>
              <option value="central">Central</option>
            </select>
          </label>
          <button
            type="button"
            disabled={aEscanear}
            onClick={executarVarredura}
            className="btn-imperial disabled:opacity-50"
          >
            {aEscanear ? 'A varrer…' : 'Escanear rede'}
          </button>
        </div>

        {hostsDescobertos.length > 0 && (
          <div className="app-table-wrap">
            <table className="table-imperial">
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Portas</th>
                  <th>Nome na aplicação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hostsDescobertos.map((h) => {
                  const ja = ipsCadastrados.has(h.ip);
                  return (
                    <tr key={h.ip}>
                      <td className="text-white font-mono">{h.ip}</td>
                      <td className="text-slate-400">
                        {h.portas.map((p) => portaLabel(p)).join(', ')}
                      </td>
                      <td>
                        <input
                          className="w-full min-w-[10rem] input-imperial py-1"
                          value={nomesPendentes[h.ip] ?? ''}
                          onChange={(e) =>
                            setNomesPendentes((prev) => ({ ...prev, [h.ip]: e.target.value }))
                          }
                          disabled={ja}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {ja ? (
                          <span className="text-xs text-slate-500">Já cadastrada</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => adicionarHostDaRede(h)}
                            className="btn-imperial text-xs py-1 px-2"
                          >
                            Adicionar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="app-card text-sm text-slate-300 space-y-2">
        <p>
          <strong className="text-white">Coletor Windows:</strong> continua a enviar as impressoras instaladas neste
          PC (menu <span className="text-imperial-400">Coletor</span>). A varredura LAN acima é complementar para
          equipamentos com IP na rede.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setMostrarManual((v) => !v)}
        className="text-sm text-link"
      >
        {mostrarManual ? 'Ocultar cadastro manual' : 'Adicionar impressora manualmente'}
      </button>

      {mostrarManual && (
        <form
          onSubmit={handleSubmit(onCreate)}
          className="grid sm:grid-cols-2 gap-3 app-card"
        >
          <input
            className="input-imperial sm:col-span-2"
            placeholder="Nome"
            {...register('nome', { required: true })}
          />
          <input
            className="input-imperial"
            placeholder="Localização"
            {...register('localizacao')}
          />
          <input
            className="input-imperial"
            placeholder="IP"
            {...register('ip_rede')}
          />
          <select
            className="select-imperial sm:col-span-2"
            {...register('tipo')}
          >
            <option value="central">Central</option>
            <option value="balcao">Balcão / filial</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
            <input type="checkbox" {...register('ativo')} defaultChecked />
            Ativa
          </label>
          <button
            type="submit"
            className="btn-imperial sm:col-span-2"
          >
            Adicionar
          </button>
        </form>
      )}

      <h2 className="text-lg font-medium text-white">Gestão — impressoras registadas</h2>
      <ul className="app-card divide-y divide-surface-border overflow-hidden p-0">
        {lista.length === 0 && (
          <li className="px-4 py-6 text-slate-500 text-sm text-center">
            Nenhuma impressora ainda. Use a varredura LAN, o coletor ou o cadastro manual.
          </li>
        )}
        {lista.map((p) => (
          <li key={p.id}>
            {editingId === p.id && editDraft ? (
              <div className="p-4 space-y-3 border-b border-surface-border">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-500 sm:col-span-2">
                    Nome
                    <input
                      className="mt-1 w-full input-imperial"
                      value={editDraft.nome}
                      onChange={(e) => setEditDraft({ ...editDraft, nome: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    IP (só leitura na edição)
                    <input
                      className="mt-1 w-full input-imperial opacity-60 cursor-not-allowed"
                      readOnly
                      value={editDraft.ip_rede || '—'}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Localização
                    <input
                      className="mt-1 w-full input-imperial"
                      value={editDraft.localizacao}
                      onChange={(e) => setEditDraft({ ...editDraft, localizacao: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Tipo
                    <select
                      className="mt-1 w-full input-imperial"
                      value={editDraft.tipo}
                      onChange={(e) => setEditDraft({ ...editDraft, tipo: e.target.value })}
                    >
                      <option value="central">Central</option>
                      <option value="balcao">Balcão / filial</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 mt-6">
                    <input
                      type="checkbox"
                      checked={editDraft.ativo}
                      onChange={(e) => setEditDraft({ ...editDraft, ativo: e.target.checked })}
                    />
                    Ativa
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={aGuardar}
                    onClick={guardarEdicao}
                    className="btn-imperial text-sm py-1.5 px-3"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                    className="btn-imperial-outline text-sm py-1.5 px-3"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 flex flex-wrap justify-between gap-3 items-center">
                <div>
                  <p className="text-white font-medium">{p.nome}</p>
                  <p className="text-xs text-slate-500">
                    {p.localizacao || '—'} · {p.ip_rede || 'sem IP'} · {p.tipo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      online(p.ultimo_heartbeat) ? 'bg-imperial-500/20 text-imperial-300' : 'bg-surface-raised text-slate-400'
                    }`}
                  >
                    {online(p.ultimo_heartbeat) ? 'Online' : 'Offline'}
                  </span>
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(p)}
                    className="btn-imperial-outline text-xs py-1 px-2"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removerImpressora(p)}
                    className="text-xs px-2 py-1 rounded-lg text-red-300 border border-red-800/50 hover:bg-red-950/40"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
