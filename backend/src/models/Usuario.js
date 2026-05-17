import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Usuario',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nome: { type: DataTypes.STRING(200), allowNull: false },
      identificador_externo: {
        type: DataTypes.STRING(320),
        allowNull: true,
        unique: true,
        comment: 'Chave estável do utilizador no Windows (ex.: DOMINIO\\user)',
      },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      departamento: { type: DataTypes.STRING(120), allowNull: true },
      cargo: { type: DataTypes.STRING(120), allowNull: true },
      token_acesso: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      role: {
        type: DataTypes.ENUM('admin', 'user'),
        allowNull: false,
        defaultValue: 'user',
      },
    },
    {
      tableName: 'usuarios',
    }
  );
