import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function LogsPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await api.get('/logs', { params: { limit: 80 } });
      setRows(data.data);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Logs do sistema</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-800 text-sm">
        <table className="min-w-full">
          <thead className="bg-slate-900 text-slate-400 text-left">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-slate-800 bg-slate-950/60">
                <td className="px-3 py-2 whitespace-nowrap text-slate-300">
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-200">{l.acao}</td>
                <td className="px-3 py-2 text-slate-400">{l.usuario?.email || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{l.ip_origem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
