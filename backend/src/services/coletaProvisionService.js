import { createHash, randomBytes } from 'crypto';
import { Op } from 'sequelize';
import models from '../models/index.js';
import { hashPassword, gerarTokenColetor } from './authService.js';

function emailColetaParaIdentificador(identificador) {
  const h = createHash('sha256').update(String(identificador).toLowerCase()).digest('hex');
  return `coleta.${h.slice(0, 28)}@auto.local`;
}

/**
 * Garante impressora para jobs/descoberta: procura por nome ou IP e cria se não existir.
 */
export async function ensureImpressoraParaJob({ nome, ip }) {
  const nomeTrim = nome?.trim() || null;
  const ipTrim = ip?.trim() || null;
  if (!nomeTrim && !ipTrim) return null;

  const or = [];
  if (nomeTrim) or.push({ nome: nomeTrim });
  if (ipTrim) or.push({ ip_rede: ipTrim });

  const found = await models.Impressora.findOne({
    where: or.length > 1 ? { [Op.or]: or } : or[0],
  });

  if (found) {
    if (ipTrim && !found.ip_rede) await found.update({ ip_rede: ipTrim });
    return found.id;
  }

  const created = await models.Impressora.create({
    nome: nomeTrim || `Impressora ${ipTrim}`,
    ip_rede: ipTrim || null,
    localizacao: null,
    tipo: 'balcao',
    ativo: true,
  });
  return created.id;
}

/**
 * Sincroniza lista vinda do coletor (Get-Printer): cria ou atualiza IP/localização em falta.
 */
export async function upsertImpressoraDescoberta({ nome, ip_rede, localizacao }) {
  const nomeTrim = nome?.trim() || null;
  const ipTrim = ip_rede?.trim() || null;
  if (!nomeTrim && !ipTrim) return null;

  const or = [];
  if (nomeTrim) or.push({ nome: nomeTrim });
  if (ipTrim) or.push({ ip_rede: ipTrim });

  let row = await models.Impressora.findOne({
    where: or.length > 1 ? { [Op.or]: or } : or[0],
  });

  if (row) {
    const updates = {};
    if (ipTrim && !row.ip_rede) updates.ip_rede = ipTrim;
    if (localizacao && !row.localizacao) updates.localizacao = localizacao;
    if (Object.keys(updates).length) await row.update(updates);
    return row;
  }

  return models.Impressora.create({
    nome: nomeTrim || `Impressora ${ipTrim}`,
    ip_rede: ipTrim || null,
    localizacao: localizacao || null,
    tipo: 'balcao',
    ativo: true,
  });
}

/**
 * Resolve ou cria utilizador a partir do proprietário do job no Windows.
 * Sem identificador: usa o utilizador do token do coletor (máquina).
 */
export async function ensureUsuarioColeta({
  identificador_windows,
  nome_usuario_exibicao,
  fallbackUsuario,
}) {
  const idExt = (identificador_windows || '').trim();
  if (!idExt) return fallbackUsuario;

  const existing = await models.Usuario.findOne({
    where: { identificador_externo: idExt },
  });
  if (existing) {
    const nome = (nome_usuario_exibicao || '').trim();
    if (nome && nome !== existing.nome) await existing.update({ nome: nome.slice(0, 200) });
    return existing;
  }

  const nome = (nome_usuario_exibicao || idExt).slice(0, 200);
  let email = emailColetaParaIdentificador(idExt);
  let tentativa = 0;
  while (tentativa < 5) {
    const clash = await models.Usuario.findOne({ where: { email } });
    if (!clash) break;
    email = emailColetaParaIdentificador(`${idExt}#${tentativa}`);
    tentativa += 1;
  }

  const password_hash = await hashPassword(randomBytes(32).toString('base64url'));
  const token_acesso = gerarTokenColetor();

  try {
    return await models.Usuario.create({
      nome,
      identificador_externo: idExt,
      email,
      departamento: null,
      cargo: null,
      password_hash,
      token_acesso,
      ativo: true,
      role: 'user',
    });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      const retry = await models.Usuario.findOne({ where: { identificador_externo: idExt } });
      if (retry) return retry;
    }
    throw e;
  }
}
