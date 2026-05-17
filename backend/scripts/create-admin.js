/**
 * Cria ou atualiza o utilizador administrador (login no painel web).
 *
 * Uso:
 *   node scripts/create-admin.js
 *   ADMIN_EMAIL=admin@empresa.local ADMIN_PASSWORD=MinhaSenhaSegura node scripts/create-admin.js
 *
 * Requer: backend/.env com DATABASE_URL válida
 */
import '../src/config/loadEnv.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import models from '../src/models/index.js';

const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const email = (process.env.ADMIN_EMAIL || 'admin@empresa.local').toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD || 'Admin@123';

function gerarTokenColetor() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 8);
}

async function main() {
  await models.sequelize.authenticate();

  const password_hash = await bcrypt.hash(password, 10);
  const existing = await models.Usuario.findOne({ where: { email } });

  if (existing) {
    existing.password_hash = password_hash;
    existing.role = 'admin';
    existing.ativo = true;
    if (!existing.token_acesso) existing.token_acesso = gerarTokenColetor();
    await existing.save();
    console.log('Administrador atualizado.');
    console.log('  E-mail:', existing.email);
    console.log('  Token coletor:', existing.token_acesso);
    console.log('  (definiu nova senha via ADMIN_PASSWORD ou padrão Admin@123)');
  } else {
    const row = await models.Usuario.create({
      id: ADMIN_ID,
      nome: 'Administrador',
      email,
      departamento: 'TI',
      cargo: 'Admin',
      token_acesso: gerarTokenColetor(),
      password_hash,
      ativo: true,
      role: 'admin',
    });
    console.log('Administrador criado.');
    console.log('  E-mail:', row.email);
    console.log('  Token coletor:', row.token_acesso);
  }

  console.log('\nCredenciais de login (painel):');
  console.log('  E-mail:', email);
  console.log('  Senha:', password === 'Admin@123' ? 'Admin@123 (altere em produção)' : '(a que definiu em ADMIN_PASSWORD)');

  await models.sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
