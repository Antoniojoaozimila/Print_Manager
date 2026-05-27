import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'ConsumivelTipo',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      codigo: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      nome: { type: DataTypes.STRING(120), allowNull: false },
      unidade: { type: DataTypes.STRING(40), allowNull: true },
      sistema: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'consumiveis_tipos' }
  );
