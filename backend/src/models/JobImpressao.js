import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'JobImpressao',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuario_id: { type: DataTypes.UUID, allowNull: false },
      impressora_id: { type: DataTypes.UUID, allowNull: true },
      data_hora: { type: DataTypes.DATE, allowNull: false },
      num_paginas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      num_copias: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      colorido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      duplex: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      tamanho_papel: { type: DataTypes.STRING(32), allowNull: true },
      formato_arquivo: { type: DataTypes.STRING(32), allowNull: true },
      tamanho_kb: { type: DataTypes.INTEGER, allowNull: true },
      nome_arquivo: { type: DataTypes.STRING(512), allowNull: true },
      nome_usuario_exibicao: { type: DataTypes.STRING(200), allowNull: true },
      computador_origem: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'jobs_impressao',
      updatedAt: false,
    }
  );
