import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/application/stores/useAuthStore';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // 1. Si NO está autenticado Y está cargando → spinner inicial
  if (!isAuthenticated && isLoading) {
    return <LoadingSpinner label="Verificando sesión..." />;
  }

  // 2. Si NO está autenticado Y ya cargó → redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si está autenticado → renderiza el contenido
  //    (aunque isLoading pueda ser true momentáneamente por checkSession
  //     en Navbar, no desmontamos el AppShell)
  return <Outlet />;
}
