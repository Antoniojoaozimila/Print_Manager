import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'TicketProjecto',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      numero: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      responsavel: { type: DataTypes.STRING(120), allowNull: false },
      usuario_id: { type: DataTypes.UUID, allowNull: true },
      projecto_sistema: { type: DataTypes.STRING(255), allowNull: false },
      tarefa: { type: DataTypes.TEXT, allowNull: false },
      data_atribuicao: { type: DataTypes.DATEONLY, allowNull: false },
      prazo: { type: DataTypes.DATEONLY, allowNull: true },
      fase_actual: { type: DataTypes.STRING(80), allowNull: true },
      percentagem_conclusao: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      alteracoes_solicitadas: { type: DataTypes.TEXT, allowNull: true },
      data_alteracao: { type: DataTypes.DATEONLY, allowNull: true },
      descricao_alteracao: { type: DataTypes.TEXT, allowNull: true },
      accao_realizada: { type: DataTypes.TEXT, allowNull: true },
      estado: {
        type: DataTypes.ENUM('Pendente', 'Em Progresso', 'Concluído', 'Cancelado'),
        allowNull: false,
        defaultValue: 'Pendente',
      },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'tickets_projectos' }
  );
