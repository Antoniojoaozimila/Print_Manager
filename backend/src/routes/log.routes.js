import express from 'express';
import { list } from '../controllers/logController.js';
import { authJwt, requireAdmin } from '../middlewares/authJwt.js';

const router = express.Router();

router.get('/', authJwt, requireAdmin, list);

export default router;
