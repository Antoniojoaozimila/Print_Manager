import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import KpiCard from '../components/ui/KpiCard';
import PageHeader from '../components/ui/PageHeader';
import HudPanel from '../components/ui/HudPanel';

const fmtMzn = (v) =>
  new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );

const CHART_GREEN = '#10b981';
const CHART_GREEN_LIGHT = '#34d399';
const CHART_GRID = '#2e2e2e';
const CHART_TICK = '#9ca3af';

const chartTooltip = {
  contentStyle: {
    background: '#1f1f1f',
    border: '1px solid #2e2e2e',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#e5e7eb' },
  itemStyle: { color: '#d1d5db' },
};

export default function GestaoDashboardPage() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/consumiveis/dashboard')
      .then(({ data }) => setD(data.data))
      .catch((e) => setErr(e.response?.data?.error || 'Erro ao carregar'));
  }, []);

  if (err) return <p className="alert-imperial-warning">{err}</p>;
  if (!d) return <p className="text-slate-400 animate-pulse">A carregar painel executivo…</p>;

  const c = d.consumiveis;
  const ex = d.executivo;
  const precos = ex?.precos_referencia;
  const volumes = ex?.volumes_impressao_mes;
  const aquisicoesMes = ex?.gasto_aquisicoes_consumiveis_mes;

  const deptVolume = (ex?.custos_por_departamento || []).slice(0, 10).map((x) => ({
    nome: x.departamento,
    folhas: Number(x.folhas) || 0,
  }));

  const provAquisicoes = (ex?.custos_por_provincia || [])
    .filter((x) => (x.aquisicoes_mes_mzn ?? 0) > 0)
    .map((x) => ({
      nome: x.provincia,
      valor: Number(x.aquisicoes_mes_mzn) || 0,
    }));

  return (
    <div className="page-content space-y-6">
      <PageHeader
        badge="Painel executivo"
        title="Gestão de impressão e custos"
        subtitle="Volumes PaperCut e aquisições reais registadas em consumíveis"
        actions={
          <>
            <Link to="/gestao/consumiveis" className="btn-imperial-outline text-xs">
              Consumíveis
            </Link>
            <Link to="/gestao/papercut" className="btn-imperial text-xs">
              PaperCut
            </Link>
          </>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Aquisições no mês"
          value={aquisicoesMes != null ? fmtMzn(aquisicoesMes) : '—'}
          sub="Soma dos registos de consumíveis"
          icon="currency"
        />
        <KpiCard
          label="Folhas impressas (mês)"
          value={Math.round(volumes?.folhas || 0).toLocaleString('pt-MZ')}
          sub={`${volumes?.resmas ?? '—'} resmas · ${volumes?.caixas ?? '—'} caixas`}
          icon="document"
        />
        <KpiCard
          label="Total histórico consumíveis"
          value={fmtMzn(c.total_gasto_mzn)}
          sub="Todas as aquisições registadas"
          icon="package"
        />
        <KpiCard
          label="Maior volume PaperCut"
          value={d.maior_usuario_papercut?.usuario_papercut || '—'}
          sub={`${d.maior_usuario_papercut?.folhas || 0} folhas`}
          icon="chart"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <HudPanel className="py-3">
          <span className="stat-label">Regra papel</span>
          <p className="stat-value mt-1">1 resma = 500 folhas · 1 caixa = 5 resmas = 2 500 folhas</p>
        </HudPanel>
        {precos?.preco_por_caixa_mzn != null && (
          <HudPanel className="py-3">
            <span className="stat-label">Preço caixa A4 (último registo)</span>
            <p className="stat-value mt-1 font-mono">{fmtMzn(precos.preco_por_caixa_mzn)}</p>
          </HudPanel>
        )}
        {precos?.preco_por_unidade_toner_mzn != null && (
          <HudPanel className="py-3">
            <span className="stat-label">Preço toner (último registo)</span>
            <p className="stat-value mt-1 font-mono">{fmtMzn(precos.preco_por_unidade_toner_mzn)}</p>
          </HudPanel>
        )}
        <HudPanel className="py-3">
          <span className="stat-label">Maior volume PaperCut</span>
          <p className="stat-value mt-1 truncate">
            {d.maior_usuario_papercut?.usuario_papercut || '—'} ({d.maior_usuario_papercut?.folhas || 0} folhas)
          </p>
        </HudPanel>
      </div>

      {d.alertas_consumiveis?.length > 0 && (
        <ul className="space-y-2">
          {d.alertas_consumiveis.map((a, i) => (
            <li key={i} className="alert-imperial-warning">
              {a.mensagem}
            </li>
          ))}
        </ul>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <HudPanel className="h-80">
          <h3 className="text-sm font-semibold mb-3 hud-section-title shrink-0">Volume por departamento</h3>
          <div className="flex-1 min-h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptVolume} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis type="number" tick={{ fill: CHART_TICK, fontSize: 10 }} />
                <YAxis type="category" dataKey="nome" width={100} tick={{ fill: CHART_TICK, fontSize: 9 }} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="folhas" name="Folhas" fill={CHART_GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HudPanel>

        <HudPanel className="h-80">
          <h3 className="text-sm font-semibold mb-3 hud-section-title shrink-0">
            Aquisições reais por província (mês)
          </h3>
          <div className="flex-1 min-h-[240px] w-full">
            {provAquisicoes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provAquisicoes}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="nome" tick={{ fill: CHART_TICK, fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: CHART_TICK, fontSize: 10 }} />
                  <Tooltip {...chartTooltip} formatter={(v) => fmtMzn(v)} />
                  <Bar dataKey="valor" name="Aquisições (MZN)" fill={CHART_GREEN_LIGHT} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm p-4">Sem aquisições registadas neste mês.</p>
            )}
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
