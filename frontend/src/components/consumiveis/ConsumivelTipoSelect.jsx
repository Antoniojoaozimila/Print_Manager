import { useState } from 'react';
import api from '../../lib/api';

const labelClass = 'label-imperial';
const inputClass = 'input-imperial';

function slugPreview(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export default function ConsumivelTipoSelect({
  tipos = [],
  value,
  onChange,
  onTipoCriado,
  required = false,
  className = inputClass,
}) {
  const [modoNovo, setModoNovo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaUnidade, setNovaUnidade] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState('');

  async function guardarNovoTipo(e) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setErro('');
    setAGuardar(true);
    try {
      const { data } = await api.post('/consumiveis/tipos', {
        nome: novoNome.trim(),
        unidade: novaUnidade.trim() || null,
      });
      onTipoCriado?.(data.data);
      onChange?.(data.data.codigo);
      setModoNovo(false);
      setNovoNome('');
      setNovaUnidade('');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao criar tipo.');
    } finally {
      setAGuardar(false);
    }
  }

  if (modoNovo) {
    return (
      <div className="space-y-2 app-card-nested p-3">
        <p className="text-xs text-slate-400 font-medium">Novo tipo de consumível</p>
        <form onSubmit={guardarNovoTipo} className="space-y-2">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              className={inputClass}
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex.: Clips"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Unidade (opcional)</label>
            <input
              className={inputClass}
              value={novaUnidade}
              onChange={(e) => setNovaUnidade(e.target.value)}
              placeholder="Ex.: caixas, unidades…"
            />
          </div>
          {novoNome.trim() && (
            <p className="text-xs text-slate-500">Código: {slugPreview(novoNome) || 'tipo'}</p>
          )}
          {erro && <p className="text-xs text-red-400">{erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={aGuardar} className="btn-imperial text-xs py-1 px-2">
              {aGuardar ? 'A guardar…' : 'Criar e seleccionar'}
            </button>
            <button
              type="button"
              className="btn-imperial-outline text-xs py-1 px-2"
              onClick={() => {
                setModoNovo(false);
                setErro('');
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <select
        className={className}
        value={value || ''}
        onChange={(e) => {
          if (e.target.value === '__novo__') {
            setModoNovo(true);
            return;
          }
          onChange?.(e.target.value);
        }}
        required={required}
      >
        <option value="">Seleccione…</option>
        {tipos.map((t) => (
          <option key={t.codigo} value={t.codigo}>
            {t.nome}
            {t.unidade ? ` (${t.unidade})` : ''}
          </option>
        ))}
        <option value="__novo__">+ Adicionar novo tipo…</option>
      </select>
    </div>
  );
}

export function labelTipo(tipos, codigo) {
  const t = tipos.find((x) => x.codigo === codigo);
  if (!t) return codigo;
  return t.unidade ? `${t.nome} (${t.unidade})` : t.nome;
}
