export function hojeMaputo() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Maputo' }).split(' ')[0];
}

export function horaMaputo() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Maputo' }).split(' ')[1]?.slice(0, 8) || '00:00:00';
}

export function horaCurta(v) {
  if (!v) return '—';
  const s = String(v);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export function duracaoLabel(min) {
  if (min == null || min === '') return '—';
  const n = Number(min);
  if (!Number.isFinite(n)) return '—';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (!h) return `${n} min`;
  return `${n} min (${h}h ${String(m).padStart(2, '0')}m)`;
}

export function nomeFicheiroDownload(headers, fallback) {
  const cd = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (!cd || typeof cd !== 'string') return fallback;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
  if (m) {
    try {
      return decodeURIComponent(m[1] || m[2] || fallback);
    } catch {
      return m[2] || fallback;
    }
  }
  return fallback;
}

export function estadoBadgeClass(estado) {
  if (estado === 'Concluído') return 'text-imperial-300 bg-imperial-500/10 border-imperial-500/30';
  if (estado === 'Em Progresso') return 'text-amber-200 bg-amber-500/10 border-amber-500/30';
  if (estado === 'Cancelado') return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  return 'text-red-200 bg-red-500/10 border-red-500/30';
}
