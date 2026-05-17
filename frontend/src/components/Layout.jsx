import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import ImperialIcon, { IconBox } from './icons/ImperialIcons';

const navClass = ({ isActive }) => (isActive ? 'nav-link-imperial-active' : 'nav-link-imperial');

const NAV_ITEMS = [
  { to: '/gestao', end: true, label: 'Painel gestão', icon: 'dashboard' },
  { to: '/gestao/consumiveis', label: 'Consumíveis', icon: 'package' },
  { to: '/gestao/papercut', label: 'PaperCut', icon: 'clipboard' },
  { to: '/usuarios', label: 'Utilizadores', icon: 'user' },
  { to: '/impressoras', label: 'Impressoras', icon: 'printer' },
  { to: '/coletor', label: 'Coletor', icon: 'antenna' },
];

const PAGE_TITLES = {
  '/gestao': 'Painel executivo',
  '/gestao/consumiveis': 'Consumíveis',
  '/gestao/papercut': 'PaperCut',
  '/usuarios': 'Utilizadores',
  '/impressoras': 'Impressoras',
  '/coletor': 'Coletor',
};

function userInitials(nome) {
  if (!nome) return 'U';
  return nome
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = PAGE_TITLES[location.pathname] || 'Gestão';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      <div className="app-shell-grid" aria-hidden />

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          aria-label="Fechar menu"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`app-sidebar fixed lg:sticky top-0 z-40 h-screen w-64 flex flex-col border-r transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-white/5">
          <Link to="/gestao" className="flex items-center gap-3 group" onClick={closeSidebar}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-imperial-500 text-sm font-bold text-white shrink-0">
              {userInitials(user?.nome)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.nome || 'Utilizador'}</p>
              <p className="text-xs text-slate-500 truncate">Print Manager</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Menu</p>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass} onClick={closeSidebar}>
              <IconBox name={item.icon} size="sm" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] text-slate-500">Imperial Seguros</p>
            <span className="text-[10px] text-slate-600">v1.0</span>
          </div>
          <button type="button" onClick={handleLogout} className="btn-imperial-outline w-full text-xs gap-2">
            <ImperialIcon name="logout" className="w-4 h-4" />
            Terminar sessão
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-[1]">
        <header className="app-header sticky top-0 z-20 border-b">
          <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg btn-imperial-ghost"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menu"
              >
                <ImperialIcon name="menu" className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{pageTitle}</p>
                <p className="text-[10px] text-slate-500 hidden sm:block">Imperial Seguros · Print Manager</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md capitalize font-medium text-imperial-300 bg-imperial-500/10 border border-imperial-500/25">
              {user?.role || 'utilizador'}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 animate-fade-in bg-surface-app">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
