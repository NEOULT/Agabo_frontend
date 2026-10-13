import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  Building2,
  Store,
  Warehouse,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useUIStore } from '@/application/stores/useUIStore';
import { useAuthStore } from '@/application/stores/useAuthStore';

/**
 * Elemento simple de navegación (una ruta).
 */
interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

/**
 * Elemento con desplegable: agrupa rutas de un módulo
 * (ej: Empresa → Sucursales, y más adelante Almacenes/Ubicaciones).
 */
interface NavGroup {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
  items: NavItem[];
}

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', roles: ['super_admin', 'branch_admin', 'viewer'] },
  { to: '/products', icon: <Package className="h-5 w-5" />, label: 'Productos', roles: ['super_admin', 'branch_admin', 'viewer'] },
  { to: '/suppliers', icon: <Truck className="h-5 w-5" />, label: 'Proveedores', roles: ['super_admin', 'branch_admin'] },
];

const navGroups: NavGroup[] = [
  {
    key: 'company',
    icon: <Building2 className="h-5 w-5" />,
    label: 'Empresa',
    roles: ['super_admin'],
    items: [
      { to: '/company/branches', icon: <Store className="h-4 w-4" />, label: 'Sucursales', roles: ['super_admin'] },
      { to: '/company/warehouses', icon: <Warehouse className="h-4 w-4" />, label: 'Almacenes', roles: ['super_admin'] },
      { to: '/company/locations', icon: <MapPin className="h-4 w-4" />, label: 'Ubicaciones', roles: ['super_admin'] },
    ],
  },
];

const navItemsAfterGroups: NavItem[] = [
  { to: '/inventory', icon: <ArrowLeftRight className="h-5 w-5" />, label: 'Inventario', roles: ['super_admin', 'branch_admin'] },
  { to: '/metrics', icon: <BarChart3 className="h-5 w-5" />, label: 'Métricas', roles: ['super_admin', 'branch_admin', 'viewer'] },
];

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
        ${isActive
          ? 'bg-sidebar-active text-sidebar-activeText'
          : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
        }
        ${collapsed ? 'justify-center px-2' : ''}`
      }
      title={item.label}
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  // El grupo "Empresa" arranca expandido si la ruta actual es de su módulo
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    company: location.pathname.startsWith('/company'),
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );
  const visibleGroups = navGroups.filter(
    (group) => user && group.roles.includes(user.role),
  );
  const visibleItemsAfter = navItemsAfterGroups.filter(
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
          <NavItemLink key={item.to} item={item} collapsed={!sidebarOpen} />
        ))}

        {/* Módulos con desplegable */}
        {visibleGroups.map((group) => {
          const isExpanded = expandedGroups[group.key] ?? false;
          const hasActiveChild = group.items.some((item) =>
            location.pathname.startsWith(item.to),
          );

          if (!sidebarOpen) {
            // Colapsado: el primer ítem del grupo se muestra como acceso directo
            return group.items.map((item) => (
              <NavItemLink key={item.to} item={item} collapsed />
            ));
          }

          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                  ${hasActiveChild || isExpanded
                    ? 'bg-sidebar-hover text-sidebar-text'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                  }
                `}
                title={group.label}
              >
                {group.icon}
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-2">
                  {group.items
                    .filter((item) => user && item.roles.includes(user.role))
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                          ${isActive
                            ? 'bg-sidebar-active text-sidebar-activeText'
                            : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                          }`
                        }
                        title={item.label}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                </div>
              )}
            </div>
          );
        })}

        {visibleItemsAfter.map((item) => (
          <NavItemLink key={item.to} item={item} collapsed={!sidebarOpen} />
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
