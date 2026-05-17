'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      nome: { type: Sequelize.STRING(200), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      departamento: { type: Sequelize.STRING(120), allowNull: true },
      cargo: { type: Sequelize.STRING(120), allowNull: true },
      token_acesso: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      role: { type: Sequelize.ENUM('admin', 'user'), allowNull: false, defaultValue: 'user' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('usuarios', ['email'], { unique: true, name: 'usuarios_email_uq' });
    await queryInterface.addIndex('usuarios', ['token_acesso'], { unique: true, name: 'usuarios_token_uq' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};
