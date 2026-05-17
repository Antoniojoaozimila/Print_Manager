import express from 'express';
import rateLimit from 'express-rate-limit';
import { list, create, update, discoverNetwork, heartbeat, remove } from '../controllers/impressoraController.js';
import { authJwt, requireAdmin } from '../middlewares/authJwt.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';

const router = express.Router();

const discoverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas varreduras. Tente dentro de alguns minutos.' },
});

router.post(
  '/descoberta-rede',
  authJwt,
  requireAdmin,
  discoverLimiter,
  validate(schemas.impressoraDiscoverNetwork),
  discoverNetwork
);
router.get('/', authJwt, list);
router.post('/', authJwt, requireAdmin, validate(schemas.impressoraCreate), create);
router.patch('/:id', authJwt, requireAdmin, validate(schemas.impressoraUpdate), update);
router.delete('/:id', authJwt, requireAdmin, remove);
router.post('/:id/heartbeat', authJwt, requireAdmin, heartbeat);

export default router;
