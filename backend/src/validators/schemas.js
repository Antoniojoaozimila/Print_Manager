import Joi from 'joi';

/** E-mails tipo empresa.local / intranet — Joi bloqueia vários TLDs por omissão */
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .max(255);

const login = Joi.object({
  email: emailSchema.required(),
  password: Joi.string().min(6).required(),
});

const usuarioCreate = Joi.object({
  nome: Joi.string().max(200).required(),
  email: emailSchema.required(),
  departamento: Joi.string().max(120).allow(null, ''),
  cargo: Joi.string().max(120).allow(null, ''),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'user').default('user'),
  ativo: Joi.boolean().default(true),
});

const usuarioUpdate = Joi.object({
  nome: Joi.string().max(200),
  email: emailSchema,
  departamento: Joi.string().max(120).allow(null, ''),
  cargo: Joi.string().max(120).allow(null, ''),
  password: Joi.string().min(6).allow(null, ''),
  role: Joi.string().valid('admin', 'user'),
  ativo: Joi.boolean(),
}).min(1);

const impressoraDiscoverNetwork = Joi.object({
  prefix: Joi.string()
    .pattern(/^(\d{1,3}\.){2}\d{1,3}$/)
    .required()
    .messages({
      'string.pattern.base': 'Use três octetos da rede, ex.: 192.168.110',
    }),
  hostInicio: Joi.number().integer().min(1).max(254).default(1),
  hostFim: Joi.number().integer().min(1).max(254).default(254),
});

const impressoraCreate = Joi.object({
  nome: Joi.string().max(200).required(),
  localizacao: Joi.string().max(255).allow(null, ''),
  ip_rede: Joi.string().max(45).allow(null, ''),
  tipo: Joi.string().valid('central', 'balcao').required(),
  ativo: Joi.boolean().default(true),
});

const impressoraUpdate = Joi.object({
  nome: Joi.string().max(200),
  localizacao: Joi.string().max(255).allow(null, ''),
  ip_rede: Joi.string().max(45).allow(null, ''),
  tipo: Joi.string().valid('central', 'balcao'),
  ativo: Joi.boolean(),
}).min(1);

const printJobCollect = Joi.object({
  jobs: Joi.array()
    .items(
      Joi.object({
        data_hora: Joi.date().iso().required(),
        nome_usuario_exibicao: Joi.string().max(200).allow(null, ''),
        nome_arquivo: Joi.string().max(512).allow(null, ''),
        num_paginas: Joi.number().integer().min(1).required(),
        num_copias: Joi.number().integer().min(1).default(1),
        colorido: Joi.boolean().default(false),
        duplex: Joi.boolean().default(false),
        tamanho_papel: Joi.string().max(32).allow(null, ''),
        formato_arquivo: Joi.string().max(32).allow(null, ''),
        tamanho_kb: Joi.number().integer().min(0).allow(null),
        computador_origem: Joi.string().max(255).allow(null, ''),
        impressora_nome: Joi.string().max(200).allow(null, ''),
        impressora_ip: Joi.string().max(45).allow(null, ''),
        identificador_windows: Joi.string().max(320).allow(null, ''),
      })
    )
    .min(1)
    .required(),
});

const printerCollect = Joi.object({
  printers: Joi.array()
    .items(
      Joi.object({
        nome: Joi.string().max(200).required(),
        ip_rede: Joi.string().max(45).allow(null, ''),
        localizacao: Joi.string().max(255).allow(null, ''),
      })
    )
    .default([]),
});

const listQuery = Joi.object({
  de: Joi.date().iso(),
  ate: Joi.date().iso(),
  usuarioId: Joi.string().uuid(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const mesRelatorio = Joi.object({
  mes: Joi.number().integer().min(1).max(12).required(),
  ano: Joi.number().integer().min(2020).max(2100).required(),
});

/** Data de término opcional: vazio ou ausente → null */
const dataTerminoConsumivel = Joi.any()
  .optional()
  .custom((value, helpers) => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return helpers.error('date.base');
    }
    return value;
  });

const codigoTipoConsumivel = Joi.string()
  .pattern(/^[a-z][a-z0-9_]{0,63}$/)
  .messages({ 'string.pattern.base': 'Código de tipo inválido' });

const consumivelListQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(25),
  provinciaId: Joi.string().uuid().allow('', null),
  departamentoId: Joi.string().uuid().allow('', null),
  tipo: codigoTipoConsumivel.allow('', null),
  de: Joi.date().iso(),
  ate: Joi.date().iso(),
  search: Joi.string().max(255).allow('', null),
});

const dataRelatorioProvincia = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({ 'string.pattern.base': 'Use formato AAAA-MM-DD' });

const consumivelFiltrosRelatorioBase = {
  provinciaId: Joi.string().uuid().allow('', null),
  departamentoId: Joi.string().uuid().allow('', null),
  tipo: codigoTipoConsumivel.allow('', null),
};

const consumivelRelatorioMensalQuery = Joi.object({
  ano: Joi.number().integer().min(2020).max(2100).required(),
  mes: Joi.number().integer().min(1).max(12).required(),
  de: dataRelatorioProvincia.allow('', null),
  ate: dataRelatorioProvincia.allow('', null),
  ...consumivelFiltrosRelatorioBase,
});

const consumivelRelatorioMensalExportQuery = consumivelRelatorioMensalQuery.keys({
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('pdf'),
});

const consumivelRelatorioAnualQuery = Joi.object({
  ano: Joi.number().integer().min(2020).max(2100).required(),
  ...consumivelFiltrosRelatorioBase,
});

const consumivelRelatorioAnualExportQuery = consumivelRelatorioAnualQuery.keys({
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('pdf'),
});

const papercutUsuarioRelatorioQuery = Joi.object({
  ano: Joi.number().integer().min(2020).max(2100),
  mes: Joi.number().integer().min(1).max(12),
  de: dataRelatorioProvincia.allow('', null),
  ate: dataRelatorioProvincia.allow('', null),
  provinciaId: Joi.string().uuid().allow('', null),
  departamentoId: Joi.string().uuid().allow('', null),
  usuario: Joi.string().max(255).allow('', null),
});

const papercutUsuarioRelatorioExportQuery = papercutUsuarioRelatorioQuery.keys({
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('pdf'),
});

const consumivelRegistoCreate = Joi.object({
  provincia_id: Joi.string().uuid().required(),
  departamento_id: Joi.string().uuid().allow(null, ''),
  tipo: codigoTipoConsumivel.required(),
  quantidade: Joi.number().positive().required(),
  preco_unitario: Joi.number().min(0).required(),
  data_aquisicao: Joi.date().required(),
  data_termino: dataTerminoConsumivel,
  observacoes: Joi.string().max(5000).allow(null, ''),
});

const consumivelLoteItem = Joi.object({
  provincia_id: Joi.string().uuid().required(),
  departamento_id: Joi.string().uuid().allow(null, ''),
  tipo: codigoTipoConsumivel.required(),
  quantidade: Joi.number().positive().required(),
  preco_unitario: Joi.number().min(0).required(),
  observacoes: Joi.string().max(5000).allow(null, ''),
});

const consumivelRegistoLoteCreate = Joi.object({
  data_aquisicao: Joi.date().required(),
  data_termino: dataTerminoConsumivel,
  observacoes_compra: Joi.string().max(5000).allow(null, ''),
  itens: Joi.array().items(consumivelLoteItem).min(1).max(50).required(),
});

const consumivelTipoCreate = Joi.object({
  nome: Joi.string().min(2).max(120).required(),
  unidade: Joi.string().max(40).allow(null, ''),
  codigo: codigoTipoConsumivel.optional(),
});

const consumivelRegistoUpdate = Joi.object({
  provincia_id: Joi.string().uuid(),
  departamento_id: Joi.string().uuid().allow(null, ''),
  tipo: codigoTipoConsumivel,
  quantidade: Joi.number().positive(),
  preco_unitario: Joi.number().min(0),
  data_aquisicao: Joi.date(),
  data_termino: dataTerminoConsumivel,
  observacoes: Joi.string().max(5000).allow(null, ''),
}).min(1);

const consumivelRelatorioProvinciaQuery = Joi.object({
  de: dataRelatorioProvincia.allow('', null),
  ate: dataRelatorioProvincia.allow('', null),
});

const consumivelRelatorioProvinciaExportQuery = Joi.object({
  de: dataRelatorioProvincia.allow('', null),
  ate: dataRelatorioProvincia.allow('', null),
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('pdf'),
});

const consumivelRegistosPeriodoExportQuery = Joi.object({
  de: dataRelatorioProvincia.required(),
  ate: dataRelatorioProvincia.required(),
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('pdf'),
});

const consumivelMapaCompletoExportQuery = Joi.object({
  de: dataRelatorioProvincia.allow('', null),
  ate: dataRelatorioProvincia.allow('', null),
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('xlsx'),
});

const papercutImportMeta = Joi.object({
  provincia_id: Joi.string().uuid().required(),
  departamento_id: Joi.string().uuid().required(),
  nome_lote: Joi.string().max(255).allow(null, ''),
});

const papercutRelatorioQuery = Joi.object({
  ano: Joi.number().integer().min(2020).max(2100).required(),
  mes: Joi.number().integer().min(1).max(12).required(),
  provinciaId: Joi.string().uuid().allow('', null),
  departamentoId: Joi.string().uuid().allow('', null),
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('pdf'),
});

const papercutDemoExportQuery = Joi.object({
  formato: Joi.string().valid('pdf', 'xlsx', 'excel', 'docx', 'word').default('pdf'),
});

export default {
  login,
  usuarioCreate,
  usuarioUpdate,
  impressoraDiscoverNetwork,
  impressoraCreate,
  impressoraUpdate,
  printJobCollect,
  printerCollect,
  listQuery,
  mesRelatorio,
  consumivelListQuery,
  consumivelRegistoCreate,
  consumivelRegistoLoteCreate,
  consumivelTipoCreate,
  consumivelRegistoUpdate,
  consumivelRelatorioProvinciaQuery,
  consumivelRelatorioProvinciaExportQuery,
  consumivelRegistosPeriodoExportQuery,
  consumivelMapaCompletoExportQuery,
  consumivelRelatorioMensalQuery,
  consumivelRelatorioMensalExportQuery,
  consumivelRelatorioAnualQuery,
  consumivelRelatorioAnualExportQuery,
  papercutImportMeta,
  papercutRelatorioQuery,
  papercutDemoExportQuery,
  papercutUsuarioRelatorioQuery,
  papercutUsuarioRelatorioExportQuery,
};
