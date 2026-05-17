import express from 'express';
import authRoutes from './auth.routes.js';
import usuarioRoutes from './usuario.routes.js';
import impressoraRoutes from './impressora.routes.js';
import collectRoutes from './collect.routes.js';
import jobRoutes from './job.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import relatorioRoutes from './relatorio.routes.js';
import logRoutes from './log.routes.js';
import backupRoutes from './backup.routes.js';
import consumiveisRoutes from './consumiveis.routes.js';
import papercutRoutes from './papercut.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/impressoras', impressoraRoutes);
router.use('/collect', collectRoutes);
router.use('/jobs', jobRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/relatorios', relatorioRoutes);
router.use('/logs', logRoutes);
router.use('/backup', backupRoutes);
router.use('/consumiveis', consumiveisRoutes);
router.use('/papercut', papercutRoutes);

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'print-manager-api' });
});

export default router;
