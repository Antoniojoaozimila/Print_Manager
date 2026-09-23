import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'TicketAssistencia',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      numero: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      tecnico: { type: DataTypes.STRING(120), allowNull: false },
      usuario_id: { type: DataTypes.UUID, allowNull: true },
      hora_inicio: { type: DataTypes.TIME, allowNull: false },
      hora_fim: { type: DataTypes.TIME, allowNull: true },
      duracao_min: { type: DataTypes.INTEGER, allowNull: true },
      departamento: { type: DataTypes.STRING(120), allowNull: true },
      provincia: { type: DataTypes.STRING(120), allowNull: true },
      colaborador_assistido: { type: DataTypes.STRING(200), allowNull: true },
      tipo_solicitacao: { type: DataTypes.STRING(120), allowNull: false },
      problema: { type: DataTypes.TEXT, allowNull: false },
      resolucao: { type: DataTypes.TEXT, allowNull: true },
      estado: {
        type: DataTypes.ENUM('Pendente', 'Em Progresso', 'Concluído', 'Cancelado'),
        allowNull: false,
        defaultValue: 'Em Progresso',
      },
      urgencia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      descricao_urgencia: { type: DataTypes.TEXT, allowNull: true },
      num_chamadas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      meio_solicitacao: { type: DataTypes.STRING(80), allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'tickets_assistencias' }
  );
