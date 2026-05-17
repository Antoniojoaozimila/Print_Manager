import { login } from '../services/authService.js';
import { registrarLog } from '../services/logService.js';

async function postLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const { token, usuario } = await login(email, password);
    await registrarLog({
      usuarioId: usuario.id,
      acao: 'LOGIN',
      detalhes: { email: usuario.email },
      ip: req.ip,
    });
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          departamento: usuario.departamento,
        },
      },
    });
  } catch (e) {
    next(e);
  }
}

async function getMe(req, res) {
  const u = req.user;
  res.json({
    success: true,
    data: {
      id: u.id,
      nome: u.nome,
      email: u.email,
      role: u.role,
      departamento: u.departamento,
      cargo: u.cargo,
      ativo: u.ativo,
    },
  });
}

export { postLogin, getMe };
