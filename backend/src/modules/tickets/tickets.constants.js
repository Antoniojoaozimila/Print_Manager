export const TICKET_TZ = 'Africa/Maputo';

export const TECNICOS = ['Zimila', 'Elton', 'Edna'];

export const TIPOS_SOLICITACAO = [
  'Assistência ao Utilizador',
  'Problema de Hardware',
  'Problema de Software',
  'Rede / Internet',
  'Sistema KIT',
  'Sistema de Gestão de Processos',
  'CRM / Cotações',
  'POS',
  'Impressão / Scanner',
  'Acessos / Permissões',
  'E-mail',
  'Formação',
  'Desenvolvimento',
  'Manutenção',
  'Outra',
  'Aquisição',
];

export const ESTADOS_TICKET = ['Pendente', 'Em Progresso', 'Concluído', 'Cancelado'];

export const MEIOS_SOLICITACAO = ['Telefone', 'WhatsApp', 'E-mail', 'Presencial', 'Sistema/Online', 'Outro'];

export const FASES_PROJECTO = [
  'Análise',
  'Desenvolvimento',
  'Testes',
  'Correcções',
  'Validação do Utilizador',
  'Implementação',
  'Concluído',
];

export const PROVINCIAS_TI = [
  'Maputo Cidade',
  'Maputo Província',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa',
];

export function agoraMaputo() {
  const s = new Date().toLocaleString('sv-SE', { timeZone: TICKET_TZ });
  const [data, hora] = s.split(' ');
  return { data, hora };
}

export function normalizarHora(valor) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const hh = String(valor.getHours()).padStart(2, '0');
    const mm = String(valor.getMinutes()).padStart(2, '0');
    const ss = String(valor.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  const str = String(valor).trim();
  const iso = /T(\d{2}:\d{2}(?::\d{2})?)/.exec(str);
  if (iso) return normalizarHora(iso[1]);
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if (!m) return null;
  const hh = String(Number(m[1])).padStart(2, '0');
  const mm = m[2];
  const ss = m[3] || '00';
  return `${hh}:${mm}:${ss}`;
}

export function horaParaSegundos(hora) {
  const n = normalizarHora(hora);
  if (!n) return null;
  const [h, m, s] = n.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

/** Igual ao Excel: ROUND(MOD(fim-inicio,1)*1440,0), incluindo passagem da meia-noite. */
export function calcularDuracaoMin(horaInicio, horaFim) {
  const a = horaParaSegundos(horaInicio);
  const b = horaParaSegundos(horaFim);
  if (a == null || b == null) return null;
  let d = b - a;
  if (d < 0) d += 24 * 3600;
  return Math.round(d / 60);
}

export function formatarHoraCurta(hora) {
  const n = normalizarHora(hora);
  return n ? n.slice(0, 5) : '';
}
