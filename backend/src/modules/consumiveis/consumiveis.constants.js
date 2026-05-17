/** Regra de negócio Imperial: 1 resma = 500 folhas; 1 caixa = 5 resmas = 2500 folhas */
export const FOLHAS_POR_RESMA_A4 = 500;
export const RESMAS_POR_CAIXA_A4 = 5;
export const FOLHAS_POR_CAIXA_A4 = FOLHAS_POR_RESMA_A4 * RESMAS_POR_CAIXA_A4;

export const TIPOS_CONSUMIVEL = ['papel_a4', 'envelope', 'toner', 'agrafos'];

export function folhasParaUnidadesA4(folhas) {
  const f = Math.max(0, Number(folhas) || 0);
  return {
    folhas: f,
    resmas: Math.round((f / FOLHAS_POR_RESMA_A4) * 100) / 100,
    caixas: Math.round((f / FOLHAS_POR_CAIXA_A4) * 100) / 100,
  };
}

export function precoPorFolhaDeCaixa(precoUnitarioCaixa) {
  const p = Number(precoUnitarioCaixa) || 0;
  return p / FOLHAS_POR_CAIXA_A4;
}

/** Estimativa toner (unidades relativas ≈ fração de cartucho) — ajustável por env */
export function estimativaTonerRelativa({ paginas, coloridas, grayscale, duplex }) {
  const p = Math.max(0, Number(paginas) || 0);
  const c = Math.max(0, Number(coloridas) || 0);
  const g = Math.max(0, Number(grayscale) || 0);
  const d = Math.max(0, Number(duplex) || 0);
  const fColor = parseFloat(process.env.TONER_FACTOR_COLOR || '0.012');
  const fGray = parseFloat(process.env.TONER_FACTOR_GRAY || '0.0015');
  const fDuplex = parseFloat(process.env.TONER_FACTOR_DUPLEX_BONUS || '0.0003');
  return (
    c * fColor +
    g * fGray +
    Math.min(p, g + c) * fDuplex * (d > 0 ? 1 : 0) +
    (p - c - g > 0 ? (p - c - g) * fGray : 0)
  );
}
