import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { IconBox } from '../components/icons/ImperialIcons';

export default function HomeModulosPage() {
  return (
    <div className="page-content space-y-6">
      <PageHeader
        badge="Imperial Seguros"
        title="Seleccione o módulo"
        subtitle="O sistema reúne relatórios de impressão e o lançamento diário das assistências técnicas de TI."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/gestao" className="app-card p-6 md:p-8 hover:border-imperial-500/40 group block">
          <IconBox name="printer" size="lg" />
          <h2 className="text-lg font-semibold text-white mt-4">Relatórios de impressões</h2>
          <p className="text-sm text-slate-400 mt-2">
            Consumíveis, PaperCut, volumes de impressão e custos por província e departamento.
          </p>
          <p className="text-xs text-imperial-300 mt-4 group-hover:underline">Abrir módulo →</p>
        </Link>

        <Link to="/tickets" className="app-card p-6 md:p-8 hover:border-imperial-500/40 group block">
          <IconBox name="ticket" size="lg" />
          <h2 className="text-lg font-semibold text-white mt-4">Assistências técnicas de TI</h2>
          <p className="text-sm text-slate-400 mt-2">
            Assistência diária, projectos e tarefas, com horários automáticos e relatório Excel do dia.
          </p>
          <p className="text-xs text-imperial-300 mt-4 group-hover:underline">Abrir módulo →</p>
        </Link>
      </div>
    </div>
  );
}
