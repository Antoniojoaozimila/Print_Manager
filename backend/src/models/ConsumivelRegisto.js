import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'ConsumivelRegisto',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      provincia_id: { type: DataTypes.UUID, allowNull: false },
      departamento_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Legado; consumíveis são por província. Departamento só PaperCut/relatórios.',
      },
      tipo: {
        type: DataTypes.ENUM('papel_a4', 'envelope', 'toner', 'agrafos'),
        allowNull: false,
      },
      quantidade: { type: DataTypes.DECIMAL(14, 4), allowNull: false },
      preco_unitario: { type: DataTypes.DECIMAL(16, 6), allowNull: false },
      preco_total: { type: DataTypes.DECIMAL(18, 6), allowNull: false },
      data_aquisicao: { type: DataTypes.DATEONLY, allowNull: false },
      data_termino: { type: DataTypes.DATEONLY, allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      registado_por_id: { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: 'consumiveis_registos' }
  );
