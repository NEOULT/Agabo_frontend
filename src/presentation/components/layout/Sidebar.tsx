import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  Store,
  ArrowLeftRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/application/stores/useUIStore';
import { useAuthStore } from '@/application/stores/useAuthStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'branch_admin', 'viewer'] },
  { to: '/products', icon: Package, label: 'Productos', roles: ['super_admin', 'branch_admin', 'viewer'] },
  { to: '/suppliers', icon: Truck, label: 'Proveedores', roles: ['super_admin', 'branch_admin'] },
  { to: '/branches', icon: Store, label: 'Sedes', roles: ['super_admin'] },
  { to: '/inventory', icon: ArrowLeftRight, label: 'Inventario', roles: ['super_admin', 'branch_admin'] },
  { to: '/metrics', icon: BarChart3, label: 'Métricas', roles: ['super_admin', 'branch_admin', 'viewer'] },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((state) => state.user);

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 h-screen bg-sidebar-bg border-r border-sidebar-border
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">🏪</span>
          {sidebarOpen && (
            <span className="text-lg font-bold text-sidebar-logo whitespace-nowrap">
              Agabo
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
              ${isActive
                ? 'bg-sidebar-active text-sidebar-activeText'
                : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
              }
              ${!sidebarOpen ? 'justify-center px-2' : ''}`
            }
            title={item.label}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-sidebar-bg border border-sidebar-toggleBorder rounded-full p-1 shadow-sm hover:bg-sidebar-toggleHover transition-colors"
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4 text-sidebar-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 text-sidebar-muted" />
        )}
      </button>
    </aside>
  );
}
