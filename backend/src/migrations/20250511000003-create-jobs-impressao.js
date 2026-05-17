'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jobs_impressao', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      impressora_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'impressoras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      data_hora: { type: Sequelize.DATE, allowNull: false },
      num_paginas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      num_copias: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      colorido: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      duplex: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      tamanho_papel: { type: Sequelize.STRING(32), allowNull: true },
      formato_arquivo: { type: Sequelize.STRING(32), allowNull: true },
      tamanho_kb: { type: Sequelize.INTEGER, allowNull: true },
      nome_arquivo: { type: Sequelize.STRING(512), allowNull: true },
      nome_usuario_exibicao: { type: Sequelize.STRING(200), allowNull: true },
      computador_origem: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('jobs_impressao', ['usuario_id', 'data_hora'], {
      name: 'jobs_usuario_data_idx',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('jobs_impressao');
  },
};
