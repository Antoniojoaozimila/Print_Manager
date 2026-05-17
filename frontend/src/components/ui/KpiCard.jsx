import ImperialIcon, { IconBox } from '../icons/ImperialIcons';

export default function KpiCard({ label, value, sub, trend, icon }) {
  const trendUp = trend != null && Number(trend) > 0;
  const trendDown = trend != null && Number(trend) < 0;

  return (
    <div className="imperial-card-kpi">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums text-white">{value}</p>
          {sub && <p className="text-xs mt-1 text-slate-500">{sub}</p>}
        </div>
        {icon && <IconBox name={icon} size="lg" />}
      </div>
      {trend != null && (
        <p
          className={`text-xs mt-2 font-medium flex items-center gap-1 ${
            trendUp ? 'text-red-400' : trendDown ? 'text-imperial-400' : 'text-slate-500'
          }`}
        >
          <ImperialIcon name={trendUp ? 'trendUp' : trendDown ? 'trendDown' : 'chart'} className="w-3.5 h-3.5" />
          {Math.abs(Number(trend)).toFixed(1)}% vs mês anterior
        </p>
      )}
    </div>
  );
}
