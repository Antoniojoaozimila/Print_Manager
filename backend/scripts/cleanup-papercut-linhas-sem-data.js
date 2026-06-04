/**
 * Remove linhas PaperCut sem data de impressão (importações HTML antigas
 * que não entram no relatório mensal). Execute uma vez antes de reimportar .htm.
 *
 * Uso: node scripts/cleanup-papercut-linhas-sem-data.js
 */
import '../src/config/loadEnv.js';
import models from '../src/models/index.js';

const [[{ n }]] = await models.sequelize.query(
  `SELECT COUNT(*) AS n FROM papercut_linhas WHERE imprimido_em IS NULL`
);
if (!n) {
  console.log('Nenhuma linha sem data.');
  await models.sequelize.close();
  process.exit(0);
}

await models.sequelize.query(`DELETE FROM papercut_linhas WHERE imprimido_em IS NULL`);
console.log(`Removidas ${n} linhas sem imprimido_em. Reimporte os ficheiros .htm/.html.`);
await models.sequelize.close();
