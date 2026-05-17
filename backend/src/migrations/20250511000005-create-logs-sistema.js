'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('logs_sistema', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      acao: { type: Sequelize.STRING(120), allowNull: false },
      detalhes: { type: Sequelize.JSONB, allowNull: true },
      ip_origem: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('logs_sistema', ['created_at'], { name: 'logs_created_idx' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('logs_sistema');
  },
};
