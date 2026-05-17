import net from 'net';

const PORTAS_PADRAO = [9100, 631, 515];

function validarPrefixo(prefix) {
  const p = String(prefix || '').trim();
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(p);
  if (!m) return null;
  const nums = [m[1], m[2], m[3]].map((x) => Number(x));
  if (nums.some((n) => n < 0 || n > 255)) return null;
  return nums.join('.');
}

function probePort(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      try {
        sock.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    sock.once('timeout', () => done(false));
    sock.connect(port, host);
  });
}

/**
 * Varre IPs prefix.N para portas comuns de impressão (JetDirect 9100, IPP 631, LPR 515).
 * Executar apenas em redes de confiança; o servidor precisa de rota IP até a sub-rede.
 */
export async function escanearSubRedeImpressoras({
  prefix,
  hostInicio = 1,
  hostFim = 254,
  portas = PORTAS_PADRAO,
  timeoutMs = 400,
  tamanhoLote = 32,
}) {
  const base = validarPrefixo(prefix);
  if (!base) {
    const err = new Error('Prefixo inválido. Use três octetos, ex.: 192.168.110');
    err.status = 400;
    throw err;
  }

  const ini = Math.max(1, Math.min(254, Number(hostInicio) || 1));
  const fim = Math.max(1, Math.min(254, Number(hostFim) || 254));
  if (ini > fim) {
    const err = new Error('hostInicio não pode ser maior que hostFim');
    err.status = 400;
    throw err;
  }

  const maxHosts = Number(process.env.DISCOVERY_MAX_HOSTS || 254);
  const span = fim - ini + 1;
  if (span > maxHosts) {
    const err = new Error(`Intervalo demasiado largo (máx. ${maxHosts} IPs por pedido)`);
    err.status = 400;
    throw err;
  }

  const ips = [];
  for (let h = ini; h <= fim; h += 1) ips.push(`${base}.${h}`);

  const encontrados = [];

  for (let i = 0; i < ips.length; i += tamanhoLote) {
    const lote = ips.slice(i, i + tamanhoLote);
    const parciais = await Promise.all(
      lote.map(async (ip) => {
        const abertas = [];
        await Promise.all(
          portas.map(async (porta) => {
            const ok = await probePort(ip, porta, timeoutMs);
            if (ok) abertas.push(porta);
          })
        );
        if (!abertas.length) return null;
        abertas.sort((a, b) => a - b);
        return { ip, portas: abertas };
      })
    );
    for (const row of parciais) {
      if (row) encontrados.push(row);
    }
  }

  return encontrados;
}

export { PORTAS_PADRAO, validarPrefixo };
