import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
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
  const custosMes = ex?.custos_impressao_mes;

  const evolucao = (ex?.evolucao_mensal_custos || []).map((x) => ({
    mes: x.label,
    custo: Number(x.custo_total_mzn) || 0,
    folhas: Number(x.folhas) || 0,
  }));

  const deptCustos = (ex?.custos_por_departamento || []).slice(0, 10).map((x) => ({
    nome: x.departamento,
    custo: Number(x.custo_total_mzn) || 0,
    folhas: Number(x.folhas) || 0,
  }));

  const provCustos = (ex?.custos_por_provincia || []).map((x) => ({
    nome: x.provincia,
    custo: Number(x.custo_total_mzn) || 0,
  }));

  const precoTxt =
    precos?.fonte === 'consumiveis' ? 'cadastro real' : 'referência padrão';
  const folhaTxt =
    precos?.preco_por_folha_mzn != null
      ? ` · ${Number(precos.preco_por_folha_mzn).toFixed(4)} MZN/folha`
      : '';

  return (
    <div className="page-content space-y-6">
      <PageHeader
        badge="Painel executivo"
        title="Gestão de impressão e custos"
        subtitle={`Custos integrados PaperCut + consumíveis. Preços: ${precoTxt}${folhaTxt}`}
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
          label="Custo impressão (mês)"
          value={fmtMzn(custosMes?.custo_total_mzn)}
          sub={`Papel ${fmtMzn(custosMes?.gasto_papel_mzn)} · Toner ${fmtMzn(custosMes?.gasto_toner_mzn)}`}
          trend={ex?.tendencia_custo_mensal_pct}
          icon="currency"
        />
        <KpiCard
          label="Folhas impressas (mês)"
          value={Math.round(custosMes?.folhas || 0).toLocaleString('pt-MZ')}
          sub={`${custosMes?.resmas ?? '—'} resmas · ${custosMes?.caixas ?? '—'} caixas`}
          icon="document"
        />
        <KpiCard
          label="Aquisições consumíveis"
          value={fmtMzn(ex?.gasto_aquisicoes_consumiveis_mes)}
          sub="Gasto real no mês corrente"
          icon="package"
        />
        <KpiCard
          label="Média custo mensal"
          value={fmtMzn(ex?.media_custo_mensal_impressao_mzn)}
          sub="Últimos 6 meses (impressão)"
          icon="chart"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <HudPanel className="py-3">
          <span className="stat-label">Regra papel</span>
          <p className="stat-value mt-1">1 resma = 500 folhas · 1 caixa = 5 resmas = 2 500 folhas</p>
        </HudPanel>
        <HudPanel className="py-3">
          <span className="stat-label">Preço/caixa A4</span>
          <p className="stat-value mt-1 font-mono">{fmtMzn(precos?.preco_por_caixa_mzn)}</p>
        </HudPanel>
        <HudPanel className="py-3">
          <span className="stat-label">Total histórico consumíveis</span>
          <p className="stat-value mt-1 font-mono">{fmtMzn(c.total_gasto_mzn)}</p>
        </HudPanel>
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
          <h3 className="text-sm font-semibold mb-3 hud-section-title shrink-0">Evolução de custos (6 meses)</h3>
          <div className="flex-1 min-h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="mes" tick={{ fill: CHART_TICK, fontSize: 10 }} />
              <YAxis tick={{ fill: CHART_TICK, fontSize: 10 }} />
              <Tooltip {...chartTooltip} formatter={(v) => fmtMzn(v)} />
              <Legend wrapperStyle={{ color: CHART_TICK, fontSize: 11 }} />
              <Line type="monotone" dataKey="custo" name="Custo (MZN)" stroke={CHART_GREEN_LIGHT} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </HudPanel>

        <HudPanel className="h-80">
          <h3 className="text-sm font-semibold mb-3 hud-section-title shrink-0">Comparativo — custo por departamento</h3>
          <div className="flex-1 min-h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptCustos} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis type="number" tick={{ fill: CHART_TICK, fontSize: 10 }} />
              <YAxis type="category" dataKey="nome" width={100} tick={{ fill: CHART_TICK, fontSize: 9 }} />
              <Tooltip {...chartTooltip} formatter={(v) => fmtMzn(v)} />
              <Bar dataKey="custo" name="Custo (MZN)" fill={CHART_GREEN} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </HudPanel>

        <HudPanel className="h-80 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3 hud-section-title shrink-0">Comparativo — custo por província</h3>
          <div className="flex-1 min-h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={provCustos}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="nome" tick={{ fill: CHART_TICK, fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: CHART_TICK, fontSize: 10 }} />
              <Tooltip {...chartTooltip} formatter={(v) => fmtMzn(v)} />
              <Bar dataKey="custo" name="Custo (MZN)" fill={CHART_GREEN_LIGHT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
