import '../src/config/loadEnv.js';
import models from '../src/models/index.js';

const [jobs] = await models.sequelize.query(`
  SELECT status, linhas_inseridas, linhas_duplicadas, linhas_erro, mensagem_erro,
         LEFT(log_processamento, 200) AS log, created_at
  FROM papercut_import_jobs ORDER BY created_at DESC LIMIT 8
`);
const [[semData]] = await models.sequelize.query(
  `SELECT COUNT(*) AS n FROM papercut_linhas WHERE imprimido_em IS NULL`
);
const [porMes] = await models.sequelize.query(`
  SELECT DATE_FORMAT(imprimido_em, '%Y-%m') AS mes, COUNT(*) AS n
  FROM papercut_linhas WHERE imprimido_em IS NOT NULL
  GROUP BY mes ORDER BY mes DESC LIMIT 6
`);

const [amostraNull] = await models.sequelize.query(`
  SELECT usuario_papercut, paginas, impressora, LEFT(documento, 40) AS doc, created_at
  FROM papercut_linhas WHERE imprimido_em IS NULL LIMIT 5
`);
const [amostraOk] = await models.sequelize.query(`
  SELECT imprimido_em, usuario_papercut, paginas FROM papercut_linhas
  WHERE imprimido_em IS NOT NULL ORDER BY created_at DESC LIMIT 3
`);

console.log('Ultimos jobs:', jobs);
console.log('Linhas sem imprimido_em:', semData.n);
console.log('Por mes:', porMes);
console.log('Amostra NULL:', amostraNull);
console.log('Amostra OK:', amostraOk);
await models.sequelize.close();
