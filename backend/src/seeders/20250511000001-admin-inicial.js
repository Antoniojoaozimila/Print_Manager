'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
module.exports = {
  async up(queryInterface) {
    const id = '00000000-0000-4000-8000-000000000001';
    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS c FROM usuarios WHERE email = :email`,
      { replacements: { email: 'admin@empresa.local' } }
    );
    if (Number(rows[0]?.c) > 0) return;

    const password_hash = await bcrypt.hash('Admin@123', 10);
    const token_acesso =
      uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 8);

    await queryInterface.bulkInsert('usuarios', [
      {
        id,
        nome: 'Administrador',
        email: 'admin@empresa.local',
        departamento: 'TI',
        cargo: 'Admin',
        token_acesso,
        password_hash,
        ativo: true,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', { id: '00000000-0000-4000-8000-000000000001' });
  },
};
