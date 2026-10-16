import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Toaster } from '@/presentation/components/ui/Toaster';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useUIStore } from '@/application/stores/useUIStore';

/** Breakpoint `lg` de Tailwind: el mismo en el que la sidebar vuelve a ser una columna. */
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

export function AppShell() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const closeMobileNav = useUIStore((state) => state.closeMobileNav);
  const location = useLocation();

  // El cajón de móvil tapa la pantalla: al navegar se cierra solo.
  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  // Si se pasa a escritorio con el cajón abierto, se cierra (allí no aplica).
  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) closeMobileNav();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [closeMobileNav]);

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar />

      {/* El contenido solo se desplaza por la sidebar en escritorio; en móvil ocupa todo el ancho */}
      {/* Solo se anima el margen (no `all`): menos propiedades que vigilar */}
      <div
        className={`transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
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
