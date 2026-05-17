import { useState } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function RelatoriosPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    setErro('');
    try {
      const { data: res } = await api.get('/relatorios/mensal', { params: { mes, ano } });
      setData(res.data);
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao carregar');
    }
  }

  async function download(tipo) {
    const token = useAuthStore.getState().token;
    const res = await fetch(`/api/relatorios/mensal/export/${tipo}?mes=${mes}&ano=${ano}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${ano}-${mes}.${tipo === 'xlsx' ? 'xlsx' : 'pdf'}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-white">Relatório mensal</h1>
      <div className="flex flex-wrap gap-3 items-end bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Mês</label>
          <input
            type="number"
            min={1}
            max={12}
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="w-24 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ano</label>
          <input
            type="number"
            min={2020}
            max={2100}
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="w-28 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5"
          />
        </div>
        <button
          type="button"
          onClick={carregar}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm"
        >
          Atualizar
        </button>
        {data && (
          <>
            <button
              type="button"
              onClick={() => download('xlsx')}
              className="px-4 py-2 rounded-lg bg-slate-800 text-sm"
            >
              Excel
            </button>
            <button
              type="button"
              onClick={() => download('pdf')}
              className="px-4 py-2 rounded-lg bg-slate-800 text-sm"
            >
              PDF
            </button>
          </>
        )}
      </div>
      {erro && <p className="text-red-400 text-sm">{erro}</p>}
      {data && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Resumo titulo="Total páginas" valor={data.totais.paginas} />
            <Resumo titulo="Colorido" valor={data.totais.color} />
            <Resumo titulo="P&B" valor={data.totais.pb} />
            <Resumo titulo="Duplex" valor={data.totais.duplex} />
            <Resumo titulo="Simples" valor={data.totais.simples} />
            <Resumo titulo="Custo estimado" valor={data.totais.custo.toFixed(4)} />
          </div>
          <h2 className="text-lg text-white font-medium">Por usuário</h2>
          <ul className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
            {data.linhas.map((l) => (
              <li key={l.usuario?.id} className="flex justify-between px-4 py-3 bg-slate-900/60 text-sm">
                <span className="text-slate-200">{l.usuario?.nome}</span>
                <span className="text-slate-400">
                  {l.total_paginas} pág. · cor {l.color} · duplex {l.duplex} · custo {l.custo_estimado}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Resumo({ titulo, valor }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="text-lg font-semibold text-white">{valor}</p>
    </div>
  );
}
