import express from 'express';
import rateLimit from 'express-rate-limit';
import { postLogin, getMe } from '../controllers/authController.js';
import { authJwt } from '../middlewares/authJwt.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(schemas.login), postLogin);
router.get('/me', authJwt, getMe);

export default router;
