import { executarBackup } from '../services/backupService.js';
import { registrarLog } from '../services/logService.js';

async function runNow(req, res, next) {
  try {
    const dest = await executarBackup();
    await registrarLog({
      usuarioId: req.user.id,
      acao: 'BACKUP_MANUAL',
      detalhes: { dest },
      ip: req.ip,
    });
    res.json({ success: true, data: { arquivo: dest } });
  } catch (e) {
    e.status = e.status || 500;
    next(e);
  }
}

export { runNow };
