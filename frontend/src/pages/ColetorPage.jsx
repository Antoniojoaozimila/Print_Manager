import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';

function defaultApiBase() {
  return import.meta.env.VITE_API_BASE_FOR_COLLECTOR?.trim() || 'http://localhost:4000/api';
}

function gerarSenha() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
}

export default function ColetorPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBase);
  const [collectorToken, setCollectorToken] = useState('');
  const [pollIntervalMs, setPollIntervalMs] = useState(8000);
  const [printerSyncIntervalMs, setPrinterSyncIntervalMs] = useState(120000);
  const [msg, setMsg] = useState('');
  const [criarNome, setCriarNome] = useState('Coletor Windows');
  const [criarEmail, setCriarEmail] = useState('coletor@empresa.local');
  const [criarSenha, setCriarSenha] = useState(() => gerarSenha());

  const configObject = useMemo(
    () => ({
      apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
      collectorToken: collectorToken.trim(),
      pollIntervalMs,
      printerSyncIntervalMs,
      queueDir: './offline-queue',
    }),
    [apiBaseUrl, collectorToken, pollIntervalMs, printerSyncIntervalMs]
  );

  const configJson = useMemo(() => JSON.stringify(configObject, null, 2), [configObject]);

  async function carregarUsuarios() {
    const { data } = await api.get('/usuarios');
    setUsuarios(data.data || []);
  }

  useEffect(() => {
    carregarUsuarios().catch(() => {});
  }, []);

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      setMsg('Copiado para a área de transferência.');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Não foi possível copiar automaticamente; selecione o texto manualmente.');
    }
  }

  function descarregarConfig() {
    const blob = new Blob([configJson], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('Ficheiro config.json gerado. Guarde-o na pasta do coletor (substitui o exemplo).');
    setTimeout(() => setMsg(''), 5000);
  }

  async function criarContaColetor(e) {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await api.post('/usuarios', {
        nome: criarNome.trim(),
        email: criarEmail.trim().toLowerCase(),
        password: criarSenha,
        role: 'user',
        ativo: true,
      });
      setCollectorToken(data.data.token_acesso);
      await carregarUsuarios();
      setMsg('Conta criada. O token foi preenchido abaixo; guarde a senha com segurança.');
    } catch (err) {
      setMsg(err.response?.data?.error || err.response?.data?.message || 'Erro ao criar utilizador.');
    }
  }

  return (
    <div className="page-content max-w-3xl space-y-6">
      <PageHeader
        badge="Coletor"
        title="Coletor Windows"
        subtitle="Configure e transfira o config.json. Impressoras e jobs são recolhidos no PC Windows."
      />

      {msg && <p className="alert-imperial-warning">{msg}</p>}

      <section className="app-card space-y-4">
        <h2 className="text-white font-medium hud-section-title">1. Criar conta do coletor (opcional)</h2>
        <p className="text-xs text-slate-500">
          Cada PC com coletor pode usar um utilizador dedicado ou um já existente. O token abaixo identifica a
          máquina perante a API.
        </p>
        <form onSubmit={criarContaColetor} className="grid sm:grid-cols-2 gap-3">
          <input
            className="input-imperial"
            value={criarNome}
            onChange={(e) => setCriarNome(e.target.value)}
            placeholder="Nome (ex.: Coletor — Receção)"
            required
          />
          <input
            className="input-imperial"
            value={criarEmail}
            onChange={(e) => setCriarEmail(e.target.value)}
            placeholder="E-mail"
            required
          />
          <div className="sm:col-span-2 flex flex-wrap gap-2 items-center">
            <input
              className="flex-1 min-w-[12rem] input-imperial"
              value={criarSenha}
              onChange={(e) => setCriarSenha(e.target.value)}
              placeholder="Senha de login (painel)"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setCriarSenha(gerarSenha())}
              className="btn-imperial-outline text-sm py-2 px-3"
            >
              Gerar senha
            </button>
          </div>
          <button
            type="submit"
            className="btn-imperial sm:col-span-2"
          >
            Criar utilizador e preencher token
          </button>
        </form>
      </section>

      <section className="app-card space-y-4">
        <h2 className="text-white font-medium hud-section-title">2. URL da API (vista do PC Windows)</h2>
        <p className="text-xs text-slate-500">
          Endereço que o coletor usa para chamar a API. Em desenvolvimento costuma ser{' '}
          <code className="text-slate-400">http://localhost:4000/api</code>. Na rede, use o IP ou hostname do
          servidor (ex.: <code className="text-slate-400">http://192.168.1.10:4000/api</code>).
        </p>
        <input
          className="w-full input-imperial"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
        />
      </section>

      <section className="app-card space-y-4">
        <h2 className="text-white font-medium hud-section-title">3. Token do coletor</h2>
        <p className="text-xs text-slate-500">
          Copie o <strong>token_acesso</strong> de um utilizador em Utilizadores, ou escolha aqui.
        </p>
        <select
          className="w-full select-imperial"
          value=""
          onChange={(e) => {
            const u = usuarios.find((x) => x.id === e.target.value);
            if (u) setCollectorToken(u.token_acesso);
            e.target.value = '';
          }}
        >
          <option value="">Selecionar utilizador…</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome} — {u.email}
            </option>
          ))}
        </select>
        <textarea
          className="w-full input-imperial font-mono text-xs min-h-[5rem]"
          placeholder="Cole o token_acesso aqui"
          value={collectorToken}
          onChange={(e) => setCollectorToken(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copiarTexto(collectorToken)}
            className="btn-imperial-outline text-sm py-2 px-3"
            disabled={!collectorToken.trim()}
          >
            Copiar token
          </button>
        </div>
      </section>

      <section className="app-card space-y-4">
        <h2 className="text-white font-medium hud-section-title">4. Intervalos (opcional)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm text-slate-400">
            Polling de jobs (ms)
            <input
              type="number"
              min={3000}
              className="mt-1 w-full input-imperial"
              value={pollIntervalMs}
              onChange={(e) => setPollIntervalMs(Number(e.target.value) || 8000)}
            />
          </label>
          <label className="text-sm text-slate-400">
            Sincronizar impressoras (ms, 0 = desligar)
            <input
              type="number"
              min={0}
              step={1000}
              className="mt-1 w-full input-imperial"
              value={printerSyncIntervalMs}
              onChange={(e) => setPrinterSyncIntervalMs(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="app-card space-y-4">
        <h2 className="text-white font-medium hud-section-title">5. Ficheiro config.json</h2>
        <pre className="text-xs app-card-nested p-3 overflow-x-auto text-slate-400 max-h-56 overflow-y-auto font-mono">
          {configJson}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copiarTexto(configJson)}
            className="btn-imperial-outline text-sm py-2 px-3"
          >
            Copiar JSON
          </button>
          <button
            type="button"
            onClick={descarregarConfig}
            className="btn-imperial text-sm py-2 px-3"
            disabled={!collectorToken.trim()}
          >
            Descarregar config.json
          </button>
        </div>
        <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2">
          <li>Guarde o ficheiro na pasta do coletor como <code className="text-slate-300">config.json</code>.</li>
          <li>Na pasta do coletor: <code className="text-slate-300">npm install</code> e <code className="text-slate-300">npm start</code> (ou serviço Windows).</li>
          <li>As impressoras passam a sincronizar para o menu Impressoras; utilizadores reais são criados ao imprimir.</li>
        </ol>
      </section>
    </div>
  );
}
