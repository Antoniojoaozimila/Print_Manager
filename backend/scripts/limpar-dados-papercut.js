/**
 * Remove apenas dados de relatórios PaperCut (importações + linhas).
 * Mantém: usuarios, consumíveis, províncias, departamentos, impressoras, etc.
 *
 * Uso: node scripts/limpar-dados-papercut.js
 */
import '../src/config/loadEnv.js';
import models from '../src/models/index.js';

const [[{ linhas }]] = await models.sequelize.query(
  'SELECT COUNT(*) AS linhas FROM papercut_linhas'
);
const [[{ jobs }]] = await models.sequelize.query(
  'SELECT COUNT(*) AS jobs FROM papercut_import_jobs'
);

if (!linhas && !jobs) {
  console.log('Não há dados PaperCut para remover.');
  await models.sequelize.close();
  process.exit(0);
}

await models.sequelize.transaction(async (t) => {
  await models.sequelize.query('DELETE FROM papercut_linhas', { transaction: t });
  await models.sequelize.query('DELETE FROM papercut_import_jobs', { transaction: t });
});

const [[depoisLinhas]] = await models.sequelize.query(
  'SELECT COUNT(*) AS n FROM papercut_linhas'
);
const [[depoisJobs]] = await models.sequelize.query(
  'SELECT COUNT(*) AS n FROM papercut_import_jobs'
);

console.log(`Removidas ${linhas} linhas e ${jobs} jobs de importação PaperCut.`);
console.log(`Estado actual: ${depoisLinhas.n} linhas, ${depoisJobs.n} jobs.`);
console.log('Utilizadores e consumíveis não foram alterados.');
await models.sequelize.close();
