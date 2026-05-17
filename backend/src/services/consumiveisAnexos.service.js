import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export function rootDirConsumiveisAnexos() {
  return process.env.STORAGE_DIR
    ? join(process.env.STORAGE_DIR, 'consumiveis-anexos')
    : join(process.cwd(), 'storage', 'consumiveis-anexos');
}

export function absolutPathAnexo(caminhoRelativo) {
  return join(rootDirConsumiveisAnexos(), caminhoRelativo);
}

const TIPOS = new Set(['cotacao', 'fatura', 'recibo', 'comprovativo_pagamento', 'outro']);

function sanitizeNome(name) {
  return String(name || 'ficheiro').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

export function normalizarTipoDocumento(t) {
  const s = String(t || '').trim();
  return TIPOS.has(s) ? s : 'outro';
}

/** Grava ficheiros em disco e cria linhas `ConsumivelAnexo`. */
export async function guardarAnexosConsumiveis(models, registoId, files, tipos = []) {
  if (!files?.length) return [];
  await mkdir(join(rootDirConsumiveisAnexos(), registoId), { recursive: true });
  const criados = [];
  for (let i = 0; i < files.length; i += 1) {
    const f = files[i];
    const nomeArm = `${randomUUID()}_${sanitizeNome(f.originalname)}`;
    const relativo = `${registoId}/${nomeArm}`.replace(/\\/g, '/');
    const abs = join(rootDirConsumiveisAnexos(), registoId, nomeArm);
    await writeFile(abs, f.buffer);
    const row = await models.ConsumivelAnexo.create({
      consumivel_registo_id: registoId,
      nome_original: String(f.originalname || 'ficheiro').slice(0, 255),
      caminho_relativo: relativo,
      mime_type: String(f.mimetype || 'application/octet-stream').slice(0, 120),
      tamanho_bytes: Number(f.size || f.buffer?.length || 0),
      documento_tipo: normalizarTipoDocumento(tipos[i]),
    });
    criados.push(row);
  }
  return criados;
}
