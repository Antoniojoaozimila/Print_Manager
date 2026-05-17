import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import FingerprintScanner from '../components/login/FingerprintScanner';
import LoginBackground from '../components/login/LoginBackground';

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

function IconUser() {
  return (
    <svg className="w-5 h-5 shrink-0 text-imperial-300/90" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.87 0-7 2.13-7 4.75V20h14v-1.25C19 16.13 15.87 14 12 14z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="w-5 h-5 shrink-0 text-imperial-300/90" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-7 8.83V18h2v-1.17c.59-.34 1-.98 1-1.72 0-1.1-.9-2-2-2s-2 .9-2 2c0 .74.41 1.38 1 1.72zM9 8V6a3 3 0 016 0v2H9z" />
    </svg>
  );
}

export default function LoginPage() {
  const { register, handleSubmit, setValue, watch } = useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanState, setScanState] = useState('idle');
  const [drawKey, setDrawKey] = useState(0);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const password = watch('password') || '';
  const resetTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function scheduleIdleReset(ms = 2600) {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setScanState('idle');
      setDrawKey((k) => k + 1);
    }, ms);
  }

  async function onSubmit(values) {
    setError('');
    setScanState('scanning');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', values);
      setAuth(data.data.token, data.data.user);
      setScanState('success');
      await new Promise((r) => setTimeout(r, 1400));
      navigate('/gestao');
    } catch (e) {
      setError(e.response?.data?.error || 'Falha no login');
      setScanState('error');
      scheduleIdleReset(2800);
    } finally {
      setLoading(false);
    }
  }

  function appendKey(key) {
    if (key === '*' || key === '#') return;
    if (scanState === 'error') {
      setScanState('idle');
      setDrawKey((k) => k + 1);
    }
    setValue('password', `${password}${key}`, { shouldValidate: true });
  }

  function clearPassword() {
    setScanState('idle');
    setDrawKey((k) => k + 1);
    setValue('password', '', { shouldValidate: true });
  }

  function onFieldChange() {
    if (scanState === 'error') {
      setScanState('idle');
      setDrawKey((k) => k + 1);
    }
    setError('');
  }

  return (
    <div className="login-hud-root">
      <LoginBackground />
      <div className="login-hud-grid" aria-hidden />
      <div className="login-hud-glow w-[420px] h-[420px] -top-20 left-1/4" aria-hidden />
      <div className="login-hud-glow w-[320px] h-[320px] bottom-0 right-1/4" aria-hidden />

      <div className="login-hud-shell animate-fade-in">
        <div className="login-hud-main">
          <span className="login-hud-corner-tl" aria-hidden />
          <span className="login-hud-corner-tr" aria-hidden />
          <span className="login-hud-corner-bl" aria-hidden />
          <span className="login-hud-corner-br" aria-hidden />

          <h1 className="login-hud-title">PRINT MANAGER</h1>
          <p className="login-hud-subtitle">Imperial Seguros</p>

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-w-sm mx-auto">
            <label className="login-hud-field">
              <IconUser />
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="E-mail"
                {...register('email', { required: true, onChange: onFieldChange })}
              />
            </label>

            <label className="login-hud-field">
              <IconLock />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Senha"
                {...register('password', { required: true, onChange: onFieldChange })}
              />
            </label>

            {error && (
              <p className="text-red-300 text-xs text-center mb-3 px-2 py-2 rounded border border-red-400/30 bg-red-950/40 animate-slide-down">
                {error}
              </p>
            )}

            <button type="submit" className="login-hud-btn" disabled={loading || scanState === 'success'}>
              {loading ? 'A validar…' : scanState === 'success' ? 'Acesso concedido' : 'LOGIN'}
            </button>
          </form>
        </div>

        <aside className="login-hud-side">
          <span className="login-hud-corner-tl lg:hidden" aria-hidden />
          <span className="login-hud-corner-br lg:hidden" aria-hidden />

          <div className="login-hud-keypad flex-1 max-w-[11rem] mx-auto">
            {KEYPAD.map((key) => (
              <button
                key={key}
                type="button"
                className="login-hud-key"
                onClick={() => (key === '*' ? clearPassword() : appendKey(key))}
                disabled={scanState === 'scanning' || scanState === 'success'}
                aria-label={key === '*' ? 'Limpar senha' : `Tecla ${key}`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="login-hud-fingerprint" role="presentation">
            <FingerprintScanner key={drawKey} state={scanState} />
          </div>
        </aside>
      </div>
    </div>
  );
}
