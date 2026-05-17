import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const [periodo, setPeriodo] = useState('mes');
  const [kpis, setKpis] = useState(null);
  const [tendencia, setTendencia] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [k, t] = await Promise.all([
        api.get('/dashboard/kpis', { params: { periodo } }),
        api.get('/dashboard/tendencia', { params: { dias: 14 } }),
      ]);
      if (!cancelled) {
        setKpis(k.data.data);
        setTendencia(t.data.data);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [periodo]);

  useEffect(() => {
    if (!token || role !== 'admin') return undefined;
    const socket = io({
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
    });
    socket.on('print_job_batch', (payload) => {
      setToast(`Novos trabalhos recebidos: ${payload.count}`);
      setTimeout(() => setToast(''), 4000);
    });
    return () => socket.disconnect();
  }, [token, role]);

  if (!kpis) {
    return <p className="text-slate-400">Carregando métricas…</p>;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-lg bg-brand-900/50 border border-brand-700 px-4 py-2 text-sm text-brand-100">
          {toast}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Painel</h1>
        <div className="flex gap-2">
          {['day', 'week', 'mes'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                periodo === p ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {p === 'day' ? 'Hoje' : p === 'week' ? '7 dias' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard titulo="Total de páginas" valor={kpis.total_paginas} />
        <KpiCard titulo="Colorido" valor={kpis.total_color} />
        <KpiCard titulo="P&B" valor={kpis.total_pb} />
        <KpiCard titulo="Duplex" valor={kpis.total_duplex} />
      </div>

      {kpis.comparativo_mes_anterior_pct !== null && (
        <p className="text-slate-400 text-sm">
          Comparativo período anterior:{' '}
          <span
            className={
              kpis.comparativo_mes_anterior_pct >= 0 ? 'text-amber-400' : 'text-emerald-400'
            }
          >
            {kpis.comparativo_mes_anterior_pct}%
          </span>
        </p>
      )}

      {role === 'admin' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Por usuário</h2>
            <ul className="space-y-2 text-sm max-h-56 overflow-auto">
              {kpis.por_usuario?.map((u) => (
                <li key={u.id} className="flex justify-between text-slate-200">
                  <span>{u.nome}</span>
                  <span className="text-brand-400">{u.paginas}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Por departamento</h2>
            <ul className="space-y-2 text-sm max-h-56 overflow-auto">
              {kpis.por_departamento?.map((d) => (
                <li key={d.departamento} className="flex justify-between text-slate-200">
                  <span>{d.departamento}</span>
                  <span className="text-brand-400">{d.paginas}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-80">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Tendência (14 dias)</h2>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={tendencia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="dia" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
            <Line type="monotone" dataKey="paginas" stroke="#38bdf8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ titulo, valor }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="text-2xl font-semibold text-white mt-1">{valor}</p>
    </div>
  );
}
