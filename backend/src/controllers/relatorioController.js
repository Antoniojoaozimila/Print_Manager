import { fetchRelatorioMensal, exportarExcel, exportarPdf } from '../services/relatorioExportService.js';

async function mensal(req, res, next) {
  try {
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    let usuarioIdFiltro = null;
    if (req.user.role !== 'admin') {
      usuarioIdFiltro = req.user.id;
    } else if (req.query.usuario_id) {
      usuarioIdFiltro = req.query.usuario_id;
    }
    const data = await fetchRelatorioMensal({ mes, ano, usuarioIdFiltro });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function mensalExcel(req, res, next) {
  try {
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    let usuarioIdFiltro = null;
    if (req.user.role !== 'admin') {
      usuarioIdFiltro = req.user.id;
    } else if (req.query.usuario_id) {
      usuarioIdFiltro = req.query.usuario_id;
    }
    const buf = await exportarExcel({ mes, ano, usuarioIdFiltro });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${ano}-${mes}.xlsx"`);
    res.send(buf);
  } catch (e) {
    next(e);
  }
}

async function mensalPdf(req, res, next) {
  try {
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    let usuarioIdFiltro = null;
    if (req.user.role !== 'admin') {
      usuarioIdFiltro = req.user.id;
    } else if (req.query.usuario_id) {
      usuarioIdFiltro = req.query.usuario_id;
    }
    const buf = await exportarPdf({ mes, ano, usuarioIdFiltro });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${ano}-${mes}.pdf"`);
    res.send(buf);
  } catch (e) {
    next(e);
  }
}

export { mensal, mensalExcel, mensalPdf };
