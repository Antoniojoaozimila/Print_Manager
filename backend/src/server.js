import './config/loadEnv.js';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createApp, logger } from './app.js';
import models from './models/index.js';
import { agendarBackup } from './services/backupService.js';

const PORT = process.env.PORT || 4000;

async function start() {
  await models.sequelize.authenticate();
  logger.info('Conexão com banco estabelecida');

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Token ausente'));
      }
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.role === 'admin') {
      socket.join('admins');
    }
    socket.join(`user:${socket.data.userId}`);
    logger.info({ msg: 'Socket conectado', userId: socket.data.userId });
  });

  app.set('io', io);

  agendarBackup();

  server.listen(PORT, () => {
    logger.info({ msg: 'API em execução', port: PORT });
  });
}

start().catch((err) => {
  logger.error(err);
  process.exit(1);
});
