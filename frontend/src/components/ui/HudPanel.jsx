/** Painel de conteúdo — cartão escuro unificado. */
export default function HudPanel({ children, className = '' }) {
  const hasFixedHeight = /\bh-\d|\bh-\[/.test(className);

  return (
    <div className={`hud-panel ${hasFixedHeight ? 'flex flex-col' : ''} ${className}`}>
      <div className={hasFixedHeight ? 'flex flex-col flex-1 min-h-0' : ''}>{children}</div>
    </div>
  );
}
