import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import UsuariosPage from './pages/UsuariosPage';
import ImpressorasPage from './pages/ImpressorasPage';
import ColetorPage from './pages/ColetorPage';
import GestaoDashboardPage from './pages/GestaoDashboardPage';
import ConsumiveisGestaoPage from './pages/ConsumiveisGestaoPage';
import PapercutGestaoPage from './pages/PapercutGestaoPage';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children, adminOnly }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && role !== 'admin') return <Navigate to="/gestao" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/gestao" replace />} />
        <Route path="gestao" element={<GestaoDashboardPage />} />
        <Route path="gestao/consumiveis" element={<ConsumiveisGestaoPage />} />
        <Route path="gestao/papercut" element={<PapercutGestaoPage />} />
        <Route
          path="usuarios"
          element={
            <PrivateRoute adminOnly>
              <UsuariosPage />
            </PrivateRoute>
          }
        />
        <Route
          path="impressoras"
          element={
            <PrivateRoute adminOnly>
              <ImpressorasPage />
            </PrivateRoute>
          }
        />
        <Route
          path="coletor"
          element={
            <PrivateRoute adminOnly>
              <ColetorPage />
            </PrivateRoute>
          }
        />
        {/* Rotas antigas desativadas — redirecionam para o painel de gestão */}
        <Route path="jobs" element={<Navigate to="/gestao" replace />} />
        <Route path="relatorios" element={<Navigate to="/gestao" replace />} />
        <Route path="logs" element={<Navigate to="/gestao" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/gestao" replace />} />
    </Routes>
  );
}
