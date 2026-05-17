import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'PapercutLinha',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      import_job_id: { type: DataTypes.UUID, allowNull: false },
      provincia_id: { type: DataTypes.UUID, allowNull: false },
      departamento_id: { type: DataTypes.UUID, allowNull: false },
      dedup_hash: { type: DataTypes.STRING(64), allowNull: false },
      imprimido_em: { type: DataTypes.DATE, allowNull: true },
      usuario_papercut: { type: DataTypes.STRING(255), allowNull: true },
      paginas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      copias: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      impressora: { type: DataTypes.STRING(255), allowNull: true },
      documento: { type: DataTypes.STRING(512), allowNull: true },
      cliente: { type: DataTypes.STRING(255), allowNull: true },
      papel: { type: DataTypes.STRING(120), allowNull: true },
      idioma: { type: DataTypes.STRING(64), allowNull: true },
      altura_mm: { type: DataTypes.INTEGER, allowNull: true },
      largura_mm: { type: DataTypes.INTEGER, allowNull: true },
      duplex: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      grayscale: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      tamanho_bytes: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'papercut_linhas', updatedAt: false }
  );
