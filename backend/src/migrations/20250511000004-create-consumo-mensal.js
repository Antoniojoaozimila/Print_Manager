'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('consumo_mensal', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mes_ano: { type: Sequelize.DATEONLY, allowNull: false },
      total_paginas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_coloridas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_pb: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_duplex: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      custo_estimado: { type: Sequelize.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('consumo_mensal', ['usuario_id', 'mes_ano'], {
      unique: true,
      name: 'consumo_usuario_mes_uq',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('consumo_mensal');
  },
};
