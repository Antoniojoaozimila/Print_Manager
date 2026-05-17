import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Impressora',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nome: { type: DataTypes.STRING(200), allowNull: false },
      localizacao: { type: DataTypes.STRING(255), allowNull: true },
      ip_rede: { type: DataTypes.STRING(45), allowNull: true },
      tipo: {
        type: DataTypes.ENUM('central', 'balcao'),
        allowNull: false,
        defaultValue: 'balcao',
      },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ultimo_heartbeat: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'impressoras',
    }
  );
