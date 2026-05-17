import express from 'express';
import rateLimit from 'express-rate-limit';
import { postJobs, postPrinters } from '../controllers/collectController.js';
import { authCollector } from '../middlewares/authCollector.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';

const router = express.Router();

const collectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/jobs', collectLimiter, authCollector, validate(schemas.printJobCollect), postJobs);
router.post(
  '/printers',
  collectLimiter,
  authCollector,
  validate(schemas.printerCollect),
  postPrinters
);

export default router;
