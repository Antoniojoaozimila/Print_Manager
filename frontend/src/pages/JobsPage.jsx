import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function JobsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      const { data } = await api.get('/jobs', { params: { page, limit: 25 } });
      setRows(data.data);
      setMeta(data.meta);
    }
    load();
  }, [page]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Trabalhos de impressão</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-400 text-left">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Arquivo</th>
              <th className="px-3 py-2">Páginas</th>
              <th className="px-3 py-2">Cópias</th>
              <th className="px-3 py-2">Cor</th>
              <th className="px-3 py-2">Duplex</th>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Impressora</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id} className="border-t border-slate-800 bg-slate-950/60">
                <td className="px-3 py-2 whitespace-nowrap text-slate-300">
                  {new Date(j.data_hora).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-200 max-w-xs truncate">{j.nome_arquivo || '—'}</td>
                <td className="px-3 py-2">{j.num_paginas}</td>
                <td className="px-3 py-2">{j.num_copias}</td>
                <td className="px-3 py-2">{j.colorido ? 'Sim' : 'Não'}</td>
                <td className="px-3 py-2">{j.duplex ? 'Sim' : 'Não'}</td>
                <td className="px-3 py-2 text-slate-300">{j.usuario?.nome}</td>
                <td className="px-3 py-2 text-slate-300">{j.impressora?.nome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta && meta.pages > 1 && (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-lg bg-slate-800 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= meta.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-lg bg-slate-800 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
