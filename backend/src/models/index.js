import '../config/loadEnv.js';
import { Sequelize } from 'sequelize';
import UsuarioModel from './Usuario.js';
import ImpressoraModel from './Impressora.js';
import JobImpressaoModel from './JobImpressao.js';
import ConsumoMensalModel from './ConsumoMensal.js';
import LogSistemaModel from './LogSistema.js';
import ProvinciaModel from './Provincia.js';
import DepartamentoGestaoModel from './DepartamentoGestao.js';
import ConsumivelRegistoModel from './ConsumivelRegisto.js';
import ConsumivelAnexoModel from './ConsumivelAnexo.js';
import PapercutImportJobModel from './PapercutImportJob.js';
import PapercutLinhaModel from './PapercutLinha.js';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não definida. Copie backend/.env.example para backend/.env e configure a ligação MySQL.'
  );
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

const Usuario = UsuarioModel(sequelize);
const Impressora = ImpressoraModel(sequelize);
const JobImpressao = JobImpressaoModel(sequelize);
const ConsumoMensal = ConsumoMensalModel(sequelize);
const LogSistema = LogSistemaModel(sequelize);
const Provincia = ProvinciaModel(sequelize);
const DepartamentoGestao = DepartamentoGestaoModel(sequelize);
const ConsumivelRegisto = ConsumivelRegistoModel(sequelize);
const ConsumivelAnexo = ConsumivelAnexoModel(sequelize);
const PapercutImportJob = PapercutImportJobModel(sequelize);
const PapercutLinha = PapercutLinhaModel(sequelize);

Usuario.hasMany(JobImpressao, { foreignKey: 'usuario_id', as: 'jobs' });
JobImpressao.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Impressora.hasMany(JobImpressao, { foreignKey: 'impressora_id', as: 'jobs' });
JobImpressao.belongsTo(Impressora, { foreignKey: 'impressora_id', as: 'impressora' });

Usuario.hasMany(ConsumoMensal, { foreignKey: 'usuario_id', as: 'consumos' });
ConsumoMensal.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasMany(LogSistema, { foreignKey: 'usuario_id', as: 'logs' });
LogSistema.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

ConsumivelRegisto.hasMany(ConsumivelAnexo, { foreignKey: 'consumivel_registo_id', as: 'anexos' });
ConsumivelAnexo.belongsTo(ConsumivelRegisto, { foreignKey: 'consumivel_registo_id', as: 'registo' });

Provincia.hasMany(ConsumivelRegisto, { foreignKey: 'provincia_id', as: 'consumiveis_registos' });
ConsumivelRegisto.belongsTo(Provincia, { foreignKey: 'provincia_id', as: 'provincia' });

DepartamentoGestao.hasMany(ConsumivelRegisto, { foreignKey: 'departamento_id', as: 'consumiveis_registos' });
ConsumivelRegisto.belongsTo(DepartamentoGestao, { foreignKey: 'departamento_id', as: 'departamento' });

Usuario.hasMany(ConsumivelRegisto, { foreignKey: 'registado_por_id', as: 'consumiveis_registados' });
ConsumivelRegisto.belongsTo(Usuario, { foreignKey: 'registado_por_id', as: 'registado_por' });

Usuario.hasMany(PapercutImportJob, { foreignKey: 'usuario_id', as: 'papercut_imports' });
PapercutImportJob.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
PapercutImportJob.belongsTo(Provincia, { foreignKey: 'provincia_id', as: 'provincia' });
PapercutImportJob.belongsTo(DepartamentoGestao, { foreignKey: 'departamento_id', as: 'departamento' });

Provincia.hasMany(PapercutLinha, { foreignKey: 'provincia_id', as: 'papercut_linhas' });
DepartamentoGestao.hasMany(PapercutLinha, { foreignKey: 'departamento_id', as: 'papercut_linhas' });
PapercutImportJob.hasMany(PapercutLinha, { foreignKey: 'import_job_id', as: 'linhas' });
PapercutLinha.belongsTo(PapercutImportJob, { foreignKey: 'import_job_id', as: 'import_job' });
PapercutLinha.belongsTo(Provincia, { foreignKey: 'provincia_id', as: 'provincia' });
PapercutLinha.belongsTo(DepartamentoGestao, { foreignKey: 'departamento_id', as: 'departamento' });

const models = {
  sequelize,
  Sequelize,
  Usuario,
  Impressora,
  JobImpressao,
  ConsumoMensal,
  LogSistema,
  Provincia,
  DepartamentoGestao,
  ConsumivelRegisto,
  ConsumivelAnexo,
  PapercutImportJob,
  PapercutLinha,
};

export default models;
