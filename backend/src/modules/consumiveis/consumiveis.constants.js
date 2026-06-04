/** Regra de negócio Imperial: 1 resma = 500 folhas; 1 caixa = 5 resmas = 2500 folhas */
export const FOLHAS_POR_RESMA_A4 = 500;
export const RESMAS_POR_CAIXA_A4 = 5;
export const FOLHAS_POR_CAIXA_A4 = FOLHAS_POR_RESMA_A4 * RESMAS_POR_CAIXA_A4;

/** Rendimento de referência de um cartucho de toner (folhas equivalentes) — ajustável por env */
export function folhasPorCartuchoToner() {
  const n = parseInt(process.env.TONER_PAGINAS_POR_CARTUCHO || '5000', 10);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}

export const TIPOS_CONSUMIVEL = ['papel_a4', 'envelope', 'toner', 'agrafos'];

export const TIPOS_CONSUMIVEL_LABEL = {
  papel_a4: 'Papel A4 (caixas)',
  envelope: 'Envelope',
  toner: 'Toner',
  agrafos: 'Agrafos',
};

export const TIPOS_CONSUMIVEL_UNIDADE = {
  papel_a4: 'caixas',
  envelope: 'unidades',
  toner: 'unidades',
  agrafos: 'unidades',
};

export function slugifyTipoCodigo(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'tipo';
}

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

export function precoPorFolhaTonerDeCartucho(precoUnitarioCartucho) {
  const p = Number(precoUnitarioCartucho) || 0;
  return p / folhasPorCartuchoToner();
}

/**
 * Folhas “equivalentes” de desgaste de toner (cor pesa mais que cinzento).
 * Usado para custo operacional = equiv × preço/folha toner (preço cartucho ÷ rendimento).
 */
export function paginasEquivalentesToner({ paginas, coloridas, grayscale, duplex }) {
  const p = Math.max(0, Number(paginas) || 0);
  const c = Math.max(0, Number(coloridas) || 0);
  const g = Math.max(0, Number(grayscale) || 0);
  const d = Math.max(0, Number(duplex) || 0);
  const pesoColor = parseFloat(process.env.TONER_PESO_PAGINA_COLOR || '3');
  const pesoGray = parseFloat(process.env.TONER_PESO_PAGINA_GRAY || '1');
  const pesoDuplex = parseFloat(process.env.TONER_PESO_DUPLEX_BONUS || '0.15');
  const resto = Math.max(0, p - c - g);
  const base = g * pesoGray + c * pesoColor + resto * pesoGray;
  const bonusDuplex = d > 0 ? Math.min(p, g + c) * pesoDuplex : 0;
  return base + bonusDuplex;
}

/**
 * Índice técnico: fração de cartuchos consumidos (ex.: 2,5 ≈ 2,5 cartuchos no período).
 * Não multiplicar directamente pelo preço do cartucho nos relatórios financeiros.
 */
export function estimativaTonerRelativa(params) {
  const equiv = paginasEquivalentesToner(params);
  const rendimento = folhasPorCartuchoToner();
  return rendimento > 0 ? equiv / rendimento : 0;
}
