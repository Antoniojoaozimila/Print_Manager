import { papercutRepository } from './papercut.repository.js';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function listarUtilizadoresPapercut() {
  const rows = await papercutRepository.listUtilizadoresComContagem();
  return rows.map((r) => ({
    usuario: r.usuario_papercut,
    total_linhas: parseInt(r.total_linhas, 10) || 0,
    total_folhas: num(r.total_folhas),
    primeira_impressao: r.primeira_impressao || null,
    ultima_impressao: r.ultima_impressao || null,
  }));
}

export async function apagarRegistosUtilizadorPapercut(usuario) {
  const nome = String(usuario || '').trim();
  if (!nome) {
    const err = new Error('Indique o nome do utilizador PaperCut.');
    err.status = 400;
    throw err;
  }

  const total = await papercutRepository.countLinhasByUsuario(nome);
  if (total === 0) {
    const err = new Error(`Não existem registos para o utilizador "${nome}".`);
    err.status = 404;
    throw err;
  }

  const linhas_removidas = await papercutRepository.deleteLinhasByUsuario(nome);
  return { usuario: nome, linhas_removidas };
}
