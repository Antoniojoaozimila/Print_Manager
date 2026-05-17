import { logger } from '../config/logger.js';

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  if (status >= 500) {
    const errMsg = err?.parent?.sqlMessage || err?.original?.sqlMessage || err?.message || String(err);
    logger.error({
      msg: errMsg,
      stack: err?.stack,
      path: req.path,
      method: req.method,
    });
  }

  res.status(status).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.details : undefined,
  });
}

export { errorHandler };
