import express from 'express';
import { runNow } from '../controllers/backupController.js';
import { authJwt, requireAdmin } from '../middlewares/authJwt.js';

const router = express.Router();

router.post('/executar', authJwt, requireAdmin, runNow);

export default router;
