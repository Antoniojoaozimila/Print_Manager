import express from 'express';
import { mensal, mensalExcel, mensalPdf } from '../controllers/relatorioController.js';
import { authJwt } from '../middlewares/authJwt.js';

const router = express.Router();

router.get('/mensal', authJwt, mensal);
router.get('/mensal/export/xlsx', authJwt, mensalExcel);
router.get('/mensal/export/pdf', authJwt, mensalPdf);

export default router;
