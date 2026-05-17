import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LogSistema',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuario_id: { type: DataTypes.UUID, allowNull: true },
      acao: { type: DataTypes.STRING(120), allowNull: false },
      detalhes: { type: DataTypes.JSON, allowNull: true },
      ip_origem: { type: DataTypes.STRING(45), allowNull: true },
    },
    {
      tableName: 'logs_sistema',
      updatedAt: false,
      createdAt: 'created_at',
    }
  );
