/**
 * Adiciona províncias Tete e Angonia à base de dados.
 * Uso: node scripts/apply-provincias-tete-angonia.js
 */
import '../src/config/loadEnv.js';
import models from '../src/models/index.js';

const NOVAS = [
  { nome: 'Tete', ordem: 13 },
  { nome: 'Angonia', ordem: 14 },
];

for (const { nome, ordem } of NOVAS) {
  const [, created] = await models.Provincia.findOrCreate({
    where: { nome },
    defaults: { ordem, ativo: true },
  });
  console.log(created ? `Criada: ${nome}` : `Já existia: ${nome}`);
}

const lista = await models.Provincia.findAll({
  where: { ativo: true },
  order: [['ordem', 'ASC'], ['nome', 'ASC']],
  attributes: ['nome', 'ordem'],
});
console.log(
  'Províncias activas:',
  lista.map((p) => p.nome).join(', ')
);
await models.sequelize.close();
