import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import { hojeMaputo, duracaoLabel, nomeFicheiroDownload } from '../lib/tickets';
import KpiCard from '../components/ui/KpiCard';
import PageHeader from '../components/ui/PageHeader';
import HudPanel from '../components/ui/HudPanel';

const chartTooltip = {
  contentStyle: {
    background: '#1f1f1f',
    border: '1px solid #2e2e2e',
    borderRadius: 8,
  },
  labelStyle: { color: '#e5e7eb' },
  itemStyle: { color: '#d1d5db' },
};

export default function TicketsDashboardPage() {
  const [data, setData] = useState(hojeMaputo());
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function carregar(dia = data) {
    setErr('');
    try {
      const { data: res } = await api.get('/tickets/dashboard', { params: { data: dia } });
      setD(res.data);
    } catch (e) {
      setErr(e.response?.data?.error || 'Erro ao carregar painel TI');
    }
  }

  useEffect(() => {
    carregar(data);
  }, [data]);

  async function baixarExcel() {
    setMsg('');
    try {
      const res = await api.get('/tickets/relatorio-dia', {
        params: { data },
        responseType: 'blob',
      });
      const nome = nomeFicheiroDownload(res.headers, `matriz-controlo-diario-ti-${data}.xlsx`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Relatório Excel descarregado.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Não foi possível gerar o Excel');
    }
  }

  if (err && !d) return <p className="alert-imperial-warning">{err}</p>;
  if (!d) return <p className="text-slate-400 animate-pulse">A carregar painel de TI…</p>;

  const ind = d.indicadores;
  const chart = (d.por_tecnico || []).map((t) => ({
    nome: t.tecnico,
    assistencias: t.total_assistencias,
    tempo: t.tempo_total_min,
  }));

  return (
    <div className="page-content space-y-6">
      <PageHeader
        badge="Assistências técnicas TI"
        title="Painel de controlo diário"
        subtitle="Indicadores automáticos por técnico, iguais à matriz Excel do departamento de TI"
        actions={
          <>
            <label className="label-imperial mb-0">
              Dia
              <input
                type="date"
                className="input-imperial mt-1"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </label>
            <button type="button" className="btn-imperial text-xs" onClick={baixarExcel}>
              Descarregar Excel do dia
            </button>
          </>
        }
      />

      {err && <p className="alert-imperial-warning">{err}</p>}
      {msg && <p className="alert-imperial-success">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        <Link to="/tickets/assistencias" className="btn-imperial text-xs">
          Nova assistência
        </Link>
        <Link to="/tickets/projectos" className="btn-imperial-outline text-xs">
          Projectos e tarefas
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Assistências do dia" value={ind.total_assistencias} sub="Linhas lançadas" icon="ticket" />
        <KpiCard label="Urgências" value={ind.total_urgencias} sub="Interrupções registadas" icon="antenna" />
        <KpiCard
          label="Tempo total"
          value={duracaoLabel(ind.tempo_total_min)}
          sub={`Média ${duracaoLabel(ind.tempo_medio_min)}`}
          icon="chart"
        />
        <KpiCard
          label="Projectos / tarefas"
          value={ind.projectos_registados}
          sub={`${ind.tarefas_concluidas} concluídas`}
          icon="document"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HudPanel>
          <p className="hud-section-title mb-4">Resumo por técnico</p>
          <div className="app-table-wrap">
            <table className="table-imperial">
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>Assist.</th>
                  <th>Concl.</th>
                  <th>Pend.</th>
                  <th>Urg.</th>
                  <th>Tempo</th>
                  <th>Proj.</th>
                </tr>
              </thead>
              <tbody>
                {(d.por_tecnico || []).map((t) => (
                  <tr key={t.tecnico}>
                    <td>{t.tecnico}</td>
                    <td>{t.total_assistencias}</td>
                    <td>{t.concluidas}</td>
                    <td>{t.pendentes}</td>
                    <td>{t.urgencias}</td>
                    <td>{duracaoLabel(t.tempo_total_min)}</td>
                    <td>{t.projectos_tarefas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HudPanel>
        <HudPanel>
          <p className="hud-section-title mb-4">Assistências por técnico</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid stroke="#2e2e2e" vertical={false} />
                <XAxis dataKey="nome" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="assistencias" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
