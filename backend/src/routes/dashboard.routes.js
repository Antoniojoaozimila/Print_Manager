import express from 'express';
import { kpis, tendencia } from '../controllers/dashboardController.js';
import { authJwt } from '../middlewares/authJwt.js';

const router = express.Router();

router.get('/kpis', authJwt, kpis);
router.get('/tendencia', authJwt, tendencia);

export default router;
