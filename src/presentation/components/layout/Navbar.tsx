import { Link } from 'react-router-dom';
import { LogOut, User, Building2, KeyRound, Menu } from 'lucide-react';
import { Select } from '@/presentation/components/ui/Select';
import { useAuth } from '@/application/hooks/useAuth';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { useUIStore } from '@/application/stores/useUIStore';

export function Navbar() {
  const { user, logout } = useAuth();
  const { branches, activeBranch, setActiveBranch } = useBranchStore();
  const mobileNavOpen = useUIStore((state) => state.mobileNavOpen);
  const openMobileNav = useUIStore((state) => state.openMobileNav);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-header-bg px-4 shadow-soft sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* En móvil la sidebar está oculta: se abre con este botón */}
        <button
          onClick={openMobileNav}
          className="-ml-1 rounded-lg p-2 text-header-text transition-colors hover:bg-header-hover lg:hidden"
          aria-label="Abrir menú"
          aria-controls="mobile-sidebar"
          aria-expanded={mobileNavOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        <h2 className="truncate text-lg font-semibold text-header-text">
          {activeBranch?.name ?? 'Sistema de Inventario'}
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Branch selector */}
        {branches.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-header-muted" />
            <Select
              value={activeBranch?.id ?? ''}
              onChange={(e) => {
                const branch = branches.find((b) => b.id === e.target.value);
                if (branch) setActiveBranch(branch);
              }}
              variant="header"
              size="sm"
              className="min-w-36"
              options={branches
                .filter((b) => b.is_active)
                .map((branch) => ({ value: branch.id, label: branch.name }))}
              aria-label="Sucursal activa"
            />
          </div>
        )}

        {/* User info */}
        <div className="flex items-center gap-3 pl-4 border-l border-header-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-header-avatar flex items-center justify-center">
              <User className="h-4 w-4 text-header-text" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-header-text">{user?.name}</p>
              <p className="text-xs text-header-muted capitalize">
                {user?.role === 'super_admin'
                  ? 'Administrador'
                  : user?.role === 'branch_admin'
                    ? 'Encargado'
                    : 'Visualizador'}
              </p>
            </div>
          </div>

          <Link
            to="/change-password"
            className="p-2 text-header-muted hover:text-header-text hover:bg-header-hover rounded-lg transition-colors"
            title="Cambiar contraseña"
          >
            <KeyRound className="h-4 w-4" />
          </Link>

          <button
            onClick={logout}
            className="p-2 text-header-muted hover:text-header-text hover:bg-header-hover rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
