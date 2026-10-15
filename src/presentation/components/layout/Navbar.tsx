import { Link } from 'react-router-dom';
import { LogOut, User, Building2, ChevronDown, KeyRound } from 'lucide-react';
import { useAuth } from '@/application/hooks/useAuth';
import { useBranchStore } from '@/application/stores/useBranchStore';

export function Navbar() {
  const { user, logout } = useAuth();
  const { branches, activeBranch, setActiveBranch } = useBranchStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-header-bg px-4 shadow-soft sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-header-text">
          {activeBranch?.name ?? 'Sistema de Inventario'}
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Branch selector */}
        {branches.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-header-muted" />
            <div className="relative">
              <select
                value={activeBranch?.id ?? ''}
                onChange={(e) => {
                  const branch = branches.find((b) => b.id === e.target.value);
                  if (branch) setActiveBranch(branch);
                }}
                className="text-sm appearance-none bg-header-select text-header-text border border-header-border rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-header-ring"
              >
                {branches
                  .filter((b) => b.is_active)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-header-muted pointer-events-none" />
            </div>
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
