import express from 'express';
import { authJwt, requireAdmin } from '../middlewares/authJwt.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';
import {
  upload,
  catalogos,
  importar,
  listImports,
  getImport,
  relatorioMensal,
  relatorioDemo,
  analises,
  exportRelatorio,
  exportRelatorioDemo,
  listarUtilizadores,
  apagarRegistosUtilizador,
} from '../controllers/papercutController.js';

const router = express.Router();

router.get('/catalogos', authJwt, requireAdmin, catalogos);
router.post(
  '/import',
  authJwt,
  requireAdmin,
  upload.array('files', 25),
  validate(schemas.papercutImportMeta),
  importar
);
router.get('/importacoes', authJwt, requireAdmin, listImports);
router.get('/importacoes/:id', authJwt, requireAdmin, getImport);
router.get('/utilizadores', authJwt, requireAdmin, listarUtilizadores);
router.post(
  '/utilizadores/apagar-registos',
  authJwt,
  requireAdmin,
  validate(schemas.papercutApagarUtilizadorBody),
  apagarRegistosUtilizador
);
router.get('/relatorios/demo', authJwt, requireAdmin, relatorioDemo);
router.get(
  '/relatorios/demo/export',
  authJwt,
  requireAdmin,
  validate(schemas.papercutDemoExportQuery, 'query'),
  exportRelatorioDemo
);
router.get(
  '/relatorios/mensal',
  authJwt,
  requireAdmin,
  validate(schemas.papercutRelatorioQuery, 'query'),
  relatorioMensal
);
router.get('/analises', authJwt, requireAdmin, analises);
router.get(
  '/relatorios/mensal/export',
  authJwt,
  requireAdmin,
  validate(schemas.papercutRelatorioQuery, 'query'),
  exportRelatorio
);
export default router;
