import multer from 'multer';
import { papercutRepository } from '../modules/papercut/papercut.repository.js';
import { consumiveisRepository } from '../modules/consumiveis/consumiveis.repository.js';
import {
  processarImportacaoFicheiros,
  relatorioMensalPapercut,
  analisesPapercut,
} from '../modules/papercut/papercutImport.service.js';
import {
  listarUtilizadoresPapercut,
  apagarRegistosUtilizadorPapercut,
} from '../modules/papercut/papercutUtilizadores.service.js';
import { validarFicheiroUpload } from '../modules/papercut/papercutFileParser.js';
import { exportarRelatorioMensal } from '../services/gestaoExport.service.js';
import { obterDadosRelatorioDemo } from '../services/papercutRelatorioDemo.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 30 },
  fileFilter(req, file, cb) {
    if (validarFicheiroUpload(file)) {
      cb(null, true);
      return;
    }
    const err = new Error(
      'Formato não suportado. Envie relatórios PaperCut em CSV ou PDF (também aceite HTML exportado do Print Logger).'
    );
    err.status = 400;
    cb(err);
  },
});

async function catalogos(req, res, next) {
  try {
    const [provincias, departamentos] = await Promise.all([
      consumiveisRepository.listProvincias(),
      consumiveisRepository.listDepartamentos(),
    ]);
    res.json({ success: true, data: { provincias, departamentos } });
  } catch (e) {
    next(e);
  }
}

async function importar(req, res, next) {
  try {
    const { provincia_id, departamento_id, nome_lote } = req.body;
    const files = req.files || [];
    if (!files.length) {
      const err = new Error('Envie pelo menos um ficheiro CSV, HTML ou PDF do PaperCut.');
      err.status = 400;
      throw err;
    }

    const rejeitados = [];
    const ficheiros = [];
    for (const f of files) {
      if (!validarFicheiroUpload(f)) {
        rejeitados.push(f.originalname || 'ficheiro');
        continue;
      }
      ficheiros.push({
        buffer: f.buffer,
        mimetype: f.mimetype,
        originalname: f.originalname,
      });
    }

    if (!ficheiros.length) {
      const err = new Error(
        `Nenhum ficheiro válido. Formatos aceites: ${['.csv', '.pdf', '.html'].join(', ')}. Rejeitados: ${rejeitados.join(', ')}`
      );
      err.status = 400;
      throw err;
    }

    const job = await processarImportacaoFicheiros({
      usuarioId: req.user.id,
      provinciaId: provincia_id,
      departamentoId: departamento_id,
      nomeLote: nome_lote,
      ficheiros,
    });

    const payload = job.toJSON();
    if (rejeitados.length) {
      payload.aviso_ficheiros_ignorados = rejeitados;
    }
    res.status(201).json({ success: true, data: payload });
  } catch (e) {
    next(e);
  }
}

async function listImports(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const { count, rows } = await papercutRepository.listJobs({ limit, offset });
    res.json({
      success: true,
      data: rows.map((r) => r.toJSON()),
      meta: { total: count, page, limit },
    });
  } catch (e) {
    next(e);
  }
}

async function getImport(req, res, next) {
  try {
    const job = await papercutRepository.findJob(req.params.id);
    if (!job) {
      const err = new Error('Importação não encontrada');
      err.status = 404;
      throw err;
    }
    res.json({ success: true, data: job.toJSON() });
  } catch (e) {
    next(e);
  }
}

async function relatorioDemo(req, res, next) {
  try {
    res.json({ success: true, data: obterDadosRelatorioDemo() });
  } catch (e) {
    next(e);
  }
}

async function exportRelatorioDemo(req, res, next) {
  try {
    const formato = (req.query.formato || 'pdf').toLowerCase();
    const data = obterDadosRelatorioDemo();
    const { buffer, contentType, filename } = await exportarRelatorioMensal(data, formato, { isDemo: true });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

async function relatorioMensal(req, res, next) {
  try {
    const data = await relatorioMensalPapercut({
      ano: Number(req.query.ano),
      mes: Number(req.query.mes),
      provinciaId: req.query.provinciaId || null,
      departamentoId: req.query.departamentoId || null,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function analises(req, res, next) {
  try {
    const data = await analisesPapercut({
      provinciaId: req.query.provinciaId || null,
      departamentoId: req.query.departamentoId || null,
      de: req.query.de || null,
      ate: req.query.ate || null,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function listarUtilizadores(req, res, next) {
  try {
    const data = await listarUtilizadoresPapercut();
    res.json({ success: true, data, meta: { total: data.length } });
  } catch (e) {
    next(e);
  }
}

async function apagarRegistosUtilizador(req, res, next) {
  try {
    const data = await apagarRegistosUtilizadorPapercut(req.body.usuario);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function exportRelatorio(req, res, next) {
  try {
    const formato = (req.query.formato || 'pdf').toLowerCase();
    const data = await relatorioMensalPapercut({
      ano: Number(req.query.ano),
      mes: Number(req.query.mes),
      provinciaId: req.query.provinciaId || null,
      departamentoId: req.query.departamentoId || null,
    });
    const { buffer, contentType, filename } = await exportarRelatorioMensal(data, formato, { isDemo: false });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

export {
  upload,
  catalogos,
  importar,
  listImports,
  getImport,
  listarUtilizadores,
  apagarRegistosUtilizador,
  relatorioMensal,
  relatorioDemo,
  analises,
  exportRelatorio,
  exportRelatorioDemo,
};
