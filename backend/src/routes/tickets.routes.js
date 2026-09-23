import express from 'express';
import { authJwt } from '../middlewares/authJwt.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';
import {
  catalogos,
  dashboard,
  listAssistencias,
  createAssistencia,
  updateAssistencia,
  concluirAssistencia,
  removeAssistencia,
  listProjectos,
  createProjecto,
  updateProjecto,
  removeProjecto,
  exportRelatorioDia,
} from '../controllers/ticketsController.js';

const router = express.Router();

router.use(authJwt);

router.get('/catalogos', catalogos);
router.get('/dashboard', validate(schemas.ticketPeriodoQuery, 'query'), dashboard);
router.get('/relatorio-dia', validate(schemas.ticketPeriodoQuery, 'query'), exportRelatorioDia);

router.get('/assistencias', validate(schemas.ticketListQuery, 'query'), listAssistencias);
router.post('/assistencias', validate(schemas.ticketAssistenciaCreate), createAssistencia);
router.patch('/assistencias/:id', validate(schemas.ticketAssistenciaUpdate), updateAssistencia);
router.post('/assistencias/:id/concluir', concluirAssistencia);
router.delete('/assistencias/:id', removeAssistencia);

router.get('/projectos', validate(schemas.ticketListQuery, 'query'), listProjectos);
router.post('/projectos', validate(schemas.ticketProjectoCreate), createProjecto);
router.patch('/projectos/:id', validate(schemas.ticketProjectoUpdate), updateProjecto);
router.delete('/projectos/:id', removeProjecto);

export default router;
