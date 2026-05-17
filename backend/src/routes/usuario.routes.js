import express from 'express';
import { list, create, update, rotateToken } from '../controllers/usuarioController.js';
import { authJwt, requireAdmin } from '../middlewares/authJwt.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';

const router = express.Router();

router.use(authJwt, requireAdmin);

router.get('/', list);
router.post('/', validate(schemas.usuarioCreate), create);
router.patch('/:id', validate(schemas.usuarioUpdate), update);
router.post('/:id/rotacionar-token', rotateToken);

export default router;
