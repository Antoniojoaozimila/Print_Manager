import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'DepartamentoGestao',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      nome: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'departamentos_gestao' }
  );
