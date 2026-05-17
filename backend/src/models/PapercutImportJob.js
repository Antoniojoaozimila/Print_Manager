import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'PapercutImportJob',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      usuario_id: { type: DataTypes.UUID, allowNull: false },
      provincia_id: { type: DataTypes.UUID, allowNull: false },
      departamento_id: { type: DataTypes.UUID, allowNull: false },
      nome_lote: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing',
      },
      total_linhas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      linhas_inseridas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      linhas_duplicadas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      linhas_erro: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      mensagem_erro: { type: DataTypes.TEXT, allowNull: true },
      log_processamento: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'papercut_import_jobs' }
  );
