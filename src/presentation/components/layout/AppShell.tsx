import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Toaster } from '@/presentation/components/ui/Toaster';
import { useUIStore } from '@/application/stores/useUIStore';

export function AppShell() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar />

      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <Navbar />

        <main className="p-6">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}
