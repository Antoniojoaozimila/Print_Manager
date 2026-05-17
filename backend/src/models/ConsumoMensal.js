import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'ConsumoMensal',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuario_id: { type: DataTypes.UUID, allowNull: false },
      mes_ano: { type: DataTypes.DATEONLY, allowNull: false },
      total_paginas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total_coloridas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total_pb: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total_duplex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      custo_estimado: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'consumo_mensal',
      indexes: [{ unique: true, fields: ['usuario_id', 'mes_ano'] }],
    }
  );
