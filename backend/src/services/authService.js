import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, role: usuario.role, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function gerarTokenColetor() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 8);
}

async function login(email, password) {
  const { default: models } = await import('../models/index.js');
  const usuario = await models.Usuario.findOne({ where: { email: email.toLowerCase() } });
  if (!usuario || !usuario.ativo) {
    const err = new Error('Credenciais inválidas');
    err.status = 401;
    throw err;
  }
  const ok = await verifyPassword(password, usuario.password_hash);
  if (!ok) {
    const err = new Error('Credenciais inválidas');
    err.status = 401;
    throw err;
  }
  const token = signToken(usuario);
  return { token, usuario };
}

export {
  hashPassword,
  verifyPassword,
  signToken,
  gerarTokenColetor,
  login,
};
