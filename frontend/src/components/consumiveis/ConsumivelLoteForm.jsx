import { useState } from 'react';
import ConsumivelTipoSelect from './ConsumivelTipoSelect';

const labelClass = 'label-imperial';
const inputClass = 'input-imperial';

const itemVazio = () => ({
  key: crypto.randomUUID(),
  provincia_id: '',
  departamento_id: '',
  tipo: '',
  quantidade: '',
  preco_unitario: '',
  observacoes: '',
});

export default function ConsumivelLoteForm({
  catalogos,
  tipos,
  onTipoCriado,
  onSubmit,
  onCancel,
  aGuardar,
}) {
  const [dataAquisicao, setDataAquisicao] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [observacoesCompra, setObservacoesCompra] = useState('');
  const [itens, setItens] = useState([itemVazio()]);

  function actualizarItem(key, campo, valor) {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, [campo]: valor } : i)));
  }

  function adicionarItem() {
    setItens((prev) => [...prev, itemVazio()]);
  }

  function removerItem(key) {
    setItens((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.key !== key)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      data_aquisicao: dataAquisicao,
      data_termino: dataTermino || null,
      observacoes_compra: observacoesCompra || null,
      itens: itens.map(({ provincia_id, departamento_id, tipo, quantidade, preco_unitario, observacoes }) => ({
        provincia_id,
        departamento_id: departamento_id || null,
        tipo,
        quantidade: Number(quantidade),
        preco_unitario: Number(preco_unitario),
        observacoes: observacoes || null,
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-slate-500">
        Registe vários consumíveis adquiridos numa única compra. Cada linha pode ter destino e tipo diferentes.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Data de aquisição *</label>
          <input
            type="date"
            className={inputClass}
            value={dataAquisicao}
            onChange={(e) => setDataAquisicao(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Data de término</label>
          <input
            type="date"
            className={inputClass}
            value={dataTermino}
            onChange={(e) => setDataTermino(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass}>Observações da compra</label>
          <textarea
            className={inputClass}
            rows={2}
            value={observacoesCompra}
            onChange={(e) => setObservacoesCompra(e.target.value)}
            placeholder="Referência da compra, fornecedor, notas gerais…"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="text-sm text-white font-medium">Itens da compra</h3>
          <button type="button" onClick={adicionarItem} className="btn-imperial-outline text-xs py-1 px-3">
            + Adicionar item
          </button>
        </div>

        {itens.map((item, idx) => (
          <div key={item.key} className="app-card-nested p-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Item {idx + 1}</span>
              {itens.length > 1 && (
                <button type="button" className="text-xs text-red-400" onClick={() => removerItem(item.key)}>
                  Remover
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Província / distrito *</label>
                <select
                  className={inputClass}
                  value={item.provincia_id}
                  onChange={(e) => actualizarItem(item.key, 'provincia_id', e.target.value)}
                  required
                >
                  <option value="">Seleccione…</option>
                  {catalogos.provincias?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Departamento / destino</label>
                <select
                  className={inputClass}
                  value={item.departamento_id}
                  onChange={(e) => actualizarItem(item.key, 'departamento_id', e.target.value)}
                >
                  <option value="">—</option>
                  {catalogos.departamentos?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo *</label>
                <ConsumivelTipoSelect
                  tipos={tipos}
                  value={item.tipo}
                  onChange={(v) => actualizarItem(item.key, 'tipo', v)}
                  onTipoCriado={onTipoCriado}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={item.quantidade}
                  onChange={(e) => actualizarItem(item.key, 'quantidade', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Preço unitário (MZN) *</label>
                <input
                  type="number"
                  step="0.0001"
                  className={inputClass}
                  value={item.preco_unitario}
                  onChange={(e) => actualizarItem(item.key, 'preco_unitario', e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass}>Observação do item</label>
                <input
                  className={inputClass}
                  value={item.observacoes}
                  onChange={(e) => actualizarItem(item.key, 'observacoes', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" disabled={aGuardar} className="btn-imperial">
          {aGuardar ? 'A registar…' : 'Registar compra em lote'}
        </button>
        <button type="button" onClick={onCancel} className="btn-imperial-outline">
          Cancelar
        </button>
      </div>
    </form>
  );
}
