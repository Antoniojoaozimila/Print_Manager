import { DataTypes } from 'sequelize';
import { unlink } from 'fs/promises';
import { join } from 'path';

function storageRoot() {
  return process.env.STORAGE_DIR
    ? join(process.env.STORAGE_DIR, 'consumiveis-anexos')
    : join(process.cwd(), 'storage', 'consumiveis-anexos');
}

export default (sequelize) => {
  const ConsumivelAnexo = sequelize.define(
    'ConsumivelAnexo',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      consumivel_registo_id: { type: DataTypes.UUID, allowNull: false },
      nome_original: { type: DataTypes.STRING(255), allowNull: false },
      caminho_relativo: { type: DataTypes.STRING(512), allowNull: false },
      mime_type: { type: DataTypes.STRING(120), allowNull: false },
      tamanho_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      documento_tipo: {
        type: DataTypes.ENUM('cotacao', 'fatura', 'recibo', 'comprovativo_pagamento', 'outro'),
        allowNull: false,
        defaultValue: 'outro',
      },
    },
    {
      tableName: 'consumiveis_anexos',
      hooks: {
        beforeDestroy: async (anexo) => {
          const abs = join(storageRoot(), anexo.caminho_relativo);
          try {
            await unlink(abs);
          } catch {
            /* ficheiro já ausente */
          }
        },
      },
    }
  );

  ConsumivelAnexo.absolutPath = (anexo) => join(storageRoot(), anexo.caminho_relativo);

  return ConsumivelAnexo;
};
