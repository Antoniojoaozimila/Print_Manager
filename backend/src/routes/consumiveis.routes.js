import express from 'express';
import { authJwt, requireAdmin } from '../middlewares/authJwt.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';
import {
  catalogos,
  list,
  create,
  update,
  remove,
  consumiveisAnexosMulter,
  uploadAnexosConsumivel,
  downloadAnexo,
  removeAnexo,
  exportRegistosPeriodo,
  exportMapaCompleto,
  metricasPapel,
  dashboard,
  relatorioPorProvincia,
  exportRelatorioPorProvincia,
  relatorioMensal,
  relatorioAnual,
  exportRelatorioMensal,
  exportRelatorioAnual,
} from '../controllers/consumiveisController.js';

const router = express.Router();

router.get('/catalogos', authJwt, catalogos);
router.get(
  '/relatorios/mapa-completo/export',
  authJwt,
  validate(schemas.consumivelMapaCompletoExportQuery, 'query'),
  exportMapaCompleto
);
router.get(
  '/relatorios/mensal',
  authJwt,
  validate(schemas.consumivelRelatorioMensalQuery, 'query'),
  relatorioMensal
);
router.get(
  '/relatorios/mensal/export',
  authJwt,
  requireAdmin,
  validate(schemas.consumivelRelatorioMensalExportQuery, 'query'),
  exportRelatorioMensal
);
router.get(
  '/relatorios/anual',
  authJwt,
  validate(schemas.consumivelRelatorioAnualQuery, 'query'),
  relatorioAnual
);
router.get(
  '/relatorios/anual/export',
  authJwt,
  requireAdmin,
  validate(schemas.consumivelRelatorioAnualExportQuery, 'query'),
  exportRelatorioAnual
);
router.get(
  '/registos/export',
  authJwt,
  requireAdmin,
  validate(schemas.consumivelRegistosPeriodoExportQuery, 'query'),
  exportRegistosPeriodo
);
router.get('/registos', authJwt, validate(schemas.consumivelListQuery, 'query'), list);
router.post(
  '/registos',
  authJwt,
  requireAdmin,
  validate(schemas.consumivelRegistoCreate),
  create
);
router.patch(
  '/registos/:id',
  authJwt,
  requireAdmin,
  validate(schemas.consumivelRegistoUpdate),
  update
);
router.delete('/registos/:id', authJwt, requireAdmin, remove);
router.get('/registos/:id/metricas-papel', authJwt, metricasPapel);
router.post(
  '/registos/:id/anexos',
  authJwt,
  requireAdmin,
  consumiveisAnexosMulter.array('files', 25),
  uploadAnexosConsumivel
);
router.get('/registos/:id/anexos/:anexoId/download', authJwt, downloadAnexo);
router.delete('/registos/:id/anexos/:anexoId', authJwt, requireAdmin, removeAnexo);
router.get('/dashboard', authJwt, requireAdmin, dashboard);
router.get(
  '/relatorios/por-provincia',
  authJwt,
  validate(schemas.consumivelRelatorioProvinciaQuery, 'query'),
  relatorioPorProvincia
);
router.get(
  '/relatorios/por-provincia/export',
  authJwt,
  requireAdmin,
  validate(schemas.consumivelRelatorioProvinciaExportQuery, 'query'),
  exportRelatorioPorProvincia
);

export default router;
