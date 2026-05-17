import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './config/logger.js';

function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  app.use('/api', routes);

  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Rota não encontrada' });
  });

  app.use(errorHandler);

  return app;
}

export { createApp, logger };
