import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';

export default function UsuariosPage() {
  const [lista, setLista] = useState([]);
  const { register, handleSubmit, reset } = useForm();
  const [msg, setMsg] = useState('');

  async function carregar() {
    const { data } = await api.get('/usuarios');
    setLista(data.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function onCreate(values) {
    setMsg('');
    try {
      const { data } = await api.post('/usuarios', values);
      reset();
      await carregar();
      setMsg(`Usuário criado. Token do coletor: ${data.data.token_acesso}`);
    } catch (e) {
      setMsg(e.response?.data?.error || 'Erro');
    }
  }

  async function rotacionar(id) {
    const { data } = await api.post(`/usuarios/${id}/rotacionar-token`);
    setMsg(`Novo token: ${data.data.token_acesso}`);
    await carregar();
  }

  return (
    <div className="page-content max-w-3xl">
      <PageHeader badge="Administração" title="Utilizadores" subtitle="Contas e tokens do coletor Windows." />
      {msg && <p className="alert-imperial-warning">{msg}</p>}
      <form onSubmit={handleSubmit(onCreate)} className="app-card grid sm:grid-cols-2 gap-3">
        <input className="input-imperial"
          placeholder="Nome"
          {...register('nome', { required: true })}
        />
        <input
          className="input-imperial"
          placeholder="E-mail"
          type="email"
          {...register('email', { required: true })}
        />
        <input
          className="input-imperial"
          placeholder="Departamento"
          {...register('departamento')}
        />
        <input
          className="input-imperial"
          placeholder="Cargo"
          {...register('cargo')}
        />
        <input
          className="input-imperial sm:col-span-2"
          placeholder="Senha inicial"
          type="password"
          {...register('password', { required: true })}
        />
        <button type="submit" className="btn-imperial sm:col-span-2">
          Cadastrar
        </button>
      </form>
      <ul className="app-card divide-y divide-surface-border overflow-hidden p-0">
        {lista.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-raised/50">
            <div>
              <p className="text-white font-medium">{u.nome}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
              <p className="text-xs text-slate-400 mt-1 break-all">Token coletor: {u.token_acesso}</p>
            </div>
            <button
              type="button"
              onClick={() => rotacionar(u.id)}
              className="btn-imperial-outline text-xs py-1 px-2"
            >
              Novo token
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
