export default function PageHeader({ title, subtitle, badge, actions }) {
  return (
    <div className="app-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {badge && <p className="hud-badge mb-2">{badge}</p>}
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-sm mt-1 max-w-2xl text-slate-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
