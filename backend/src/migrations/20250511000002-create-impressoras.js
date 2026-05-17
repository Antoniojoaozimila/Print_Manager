'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('impressoras', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      nome: { type: Sequelize.STRING(200), allowNull: false },
      localizacao: { type: Sequelize.STRING(255), allowNull: true },
      ip_rede: { type: Sequelize.STRING(45), allowNull: true },
      tipo: { type: Sequelize.ENUM('central', 'balcao'), allowNull: false, defaultValue: 'balcao' },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ultimo_heartbeat: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('impressoras');
  },
};
