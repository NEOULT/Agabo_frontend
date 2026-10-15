import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Toaster } from '@/presentation/components/ui/Toaster';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useUIStore } from '@/application/stores/useUIStore';

export function AppShell() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar />

      {/* Solo se anima el margen (no `all`): menos propiedades que vigilar */}
      <div
        className={`transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <Navbar />

        <main className="p-4 sm:p-6">
          <Suspense
            fallback={
              <div className="flex min-h-[60vh] items-center justify-center">
                <LoadingSpinner label="Cargando..." />
              </div>
            }
          >
            {/* La clave por ruta dispara una entrada suave al navegar (opacity + transform) */}
            <div key={location.pathname} className="animate-fade-in-up">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
