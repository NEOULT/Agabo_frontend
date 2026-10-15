import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Ruler,
  DollarSign,
  Truck,
  Building2,
  Store,
  Warehouse,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  ShoppingCart,
  PackageCheck,
  Receipt,
  UserRound,
  CreditCard,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useUIStore } from '@/application/stores/useUIStore';
import { useAuthStore } from '@/application/stores/useAuthStore';
import { usePermissions } from '@/application/hooks/usePermissions';
import type { PermissionKey, UserRole } from '@/domain/models';

/**
 * Elemento simple de navegación (una ruta).
 *
 * `permissions` son claves de permiso de la vista de sesión
 * (`<módulo>.<recurso>:<acción>`); si se indican, el acceso se resuelve con los
 * permisos de la sesión y `roles` queda como respaldo cuando el mapa de
 * permisos no llega.
 */
interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: UserRole[];
  permissions?: PermissionKey[];
  /**
   * Marca la ruta como coincidencia exacta. Necesario mientras una ruta sea
   * prefijo de otra del mismo grupo (ej: Punto de venta `/sales` frente a
   * Historial `/sales/history`).
   */
  end?: boolean;
}

/**
 * Elemento con desplegable: agrupa rutas de un módulo
 * (ej: Empresa → Sucursales, y más adelante Almacenes/Ubicaciones).
 */
interface NavGroup {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: UserRole[];
  permissions?: PermissionKey[];
  items: NavItem[];
}

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', roles: ['super_admin', 'branch_admin', 'viewer'] },
];

const navGroups: NavGroup[] = [
  {
    key: 'purchases',
    icon: <ShoppingCart className="h-5 w-5" />,
    label: 'Compras',
    roles: ['super_admin', 'branch_admin'],
    permissions: [
      'purchases.suppliers:read',
      'purchases.purchase_orders:read',
      'purchases.purchase_receipts:read',
    ],
    items: [
      { to: '/suppliers', icon: <Truck className="h-4 w-4" />, label: 'Proveedores', roles: ['super_admin', 'branch_admin'], permissions: ['purchases.suppliers:read'] },
      { to: '/purchases/orders', icon: <ShoppingCart className="h-4 w-4" />, label: 'Órdenes', roles: ['super_admin', 'branch_admin'], permissions: ['purchases.purchase_orders:read'] },
      { to: '/purchases/receipts', icon: <PackageCheck className="h-4 w-4" />, label: 'Recepciones', roles: ['super_admin', 'branch_admin'], permissions: ['purchases.purchase_receipts:read'] },
    ],
  },
  {
    key: 'sales',
    icon: <Receipt className="h-5 w-5" />,
    label: 'Ventas',
    roles: ['super_admin', 'branch_admin'],
    permissions: [
      'sales.sales:read',
      'sales.customers:read',
      'sales.payment_methods:read',
    ],
    items: [
      { to: '/sales', end: true, icon: <ShoppingCart className="h-4 w-4" />, label: 'Punto de venta', roles: ['super_admin', 'branch_admin'], permissions: ['sales.sales:read'] },
      { to: '/sales/history', icon: <Receipt className="h-4 w-4" />, label: 'Historial', roles: ['super_admin', 'branch_admin'], permissions: ['sales.sales:read'] },
      { to: '/sales/customers', icon: <UserRound className="h-4 w-4" />, label: 'Clientes', roles: ['super_admin', 'branch_admin'], permissions: ['sales.customers:read'] },
      { to: '/sales/payment-methods', icon: <CreditCard className="h-4 w-4" />, label: 'Métodos de pago', roles: ['super_admin', 'branch_admin'], permissions: ['sales.payment_methods:read'] },
    ],
  },
  {
    key: 'catalog',
    icon: <Package className="h-5 w-5" />,
    label: 'Catálogo',
    roles: ['super_admin', 'branch_admin'],
    permissions: [
      'catalog.products:read',
      'catalog.categories:read',
      'catalog.brands:read',
      'catalog.units:read',
      'catalog.price_lists:read',
    ],
    items: [
      { to: '/catalog/products', icon: <Package className="h-4 w-4" />, label: 'Productos', roles: ['super_admin', 'branch_admin'], permissions: ['catalog.products:read'] },
      { to: '/catalog/categories', icon: <FolderTree className="h-4 w-4" />, label: 'Categorías', roles: ['super_admin', 'branch_admin'], permissions: ['catalog.categories:read'] },
      { to: '/catalog/brands', icon: <Tags className="h-4 w-4" />, label: 'Marcas', roles: ['super_admin', 'branch_admin'], permissions: ['catalog.brands:read'] },
      { to: '/catalog/units', icon: <Ruler className="h-4 w-4" />, label: 'Unidades', roles: ['super_admin', 'branch_admin'], permissions: ['catalog.units:read'] },
      { to: '/catalog/price-lists', icon: <DollarSign className="h-4 w-4" />, label: 'Precios', roles: ['super_admin', 'branch_admin'], permissions: ['catalog.price_lists:read'] },
    ],
  },
  {
    key: 'security',
    icon: <ShieldCheck className="h-5 w-5" />,
    label: 'Seguridad',
    roles: ['super_admin'],
    permissions: ['security.users:read', 'security.profiles:read'],
    items: [
      { to: '/security/users', icon: <Users className="h-4 w-4" />, label: 'Usuarios', roles: ['super_admin'], permissions: ['security.users:read'] },
      { to: '/security/profiles', icon: <ShieldCheck className="h-4 w-4" />, label: 'Perfiles', roles: ['super_admin'], permissions: ['security.profiles:read'] },
    ],
  },
  {
    key: 'company',
    icon: <Building2 className="h-5 w-5" />,
    label: 'Empresa',
    roles: ['super_admin'],
    permissions: [
      'company.branches:read',
      'company.warehouses:read',
      'company.locations:read',
    ],
    items: [
      { to: '/company/branches', icon: <Store className="h-4 w-4" />, label: 'Sucursales', roles: ['super_admin'], permissions: ['company.branches:read'] },
      { to: '/company/warehouses', icon: <Warehouse className="h-4 w-4" />, label: 'Almacenes', roles: ['super_admin'], permissions: ['company.warehouses:read'] },
      { to: '/company/locations', icon: <MapPin className="h-4 w-4" />, label: 'Ubicaciones', roles: ['super_admin'], permissions: ['company.locations:read'] },
    ],
  },
  {
    key: 'inventory',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    label: 'Inventario',
    roles: ['super_admin', 'branch_admin'],
    permissions: [
      'inventory.movements:read',
      'inventory.movement_types:read',
      'inventory.stocks:read',
    ],
    items: [
      { to: '/inventory', end: true, icon: <ArrowLeftRight className="h-4 w-4" />, label: 'Movimientos', roles: ['super_admin', 'branch_admin'], permissions: ['inventory.movements:read'] },
      { to: '/inventory/movement-types', icon: <Tags className="h-4 w-4" />, label: 'Tipos de movimiento', roles: ['super_admin', 'branch_admin'], permissions: ['inventory.movement_types:read'] },
      { to: '/inventory/stocks', icon: <Package className="h-4 w-4" />, label: 'Existencias', roles: ['super_admin', 'branch_admin'], permissions: ['inventory.stocks:read'] },
    ],
  },
];

const navItemsAfterGroups: NavItem[] = [
  { to: '/metrics', icon: <BarChart3 className="h-5 w-5" />, label: 'Métricas', roles: ['super_admin', 'branch_admin', 'viewer'] },
];

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end ?? item.to === '/'}
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

  const { canWithFallback } = usePermissions();

  // El grupo "Empresa" arranca expandido si la ruta actual es de su módulo
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    // Proveedores vive bajo el grupo Compras aunque su ruta sea /suppliers
    purchases:
      location.pathname.startsWith('/purchases') || location.pathname.startsWith('/suppliers'),
    sales: location.pathname.startsWith('/sales'),
    catalog: location.pathname.startsWith('/catalog'),
    company: location.pathname.startsWith('/company'),
    security: location.pathname.startsWith('/security'),
    inventory: location.pathname.startsWith('/inventory'),
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** Rol como respaldo y, si el backend mandó permisos, la clave del permiso. */
  const isAllowed = (entry: NavItem | NavGroup) => {
    if (!user || !entry.roles.includes(user.role)) return false;
    if (!entry.permissions) return true;
    return canWithFallback(entry.permissions, entry.roles);
  };

  const visibleItems = navItems.filter(isAllowed);
  const visibleGroups = navGroups.filter(isAllowed);
  const visibleItemsAfter = navItemsAfterGroups.filter(isAllowed);

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar-bg border-r border-sidebar-border
        transition-[width] duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}
    >
      {/* Logo */}
      <div className="flex h-16 flex-shrink-0 items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">🏪</span>
          {sidebarOpen && (
            <span className="text-lg font-bold text-sidebar-logo whitespace-nowrap">
              Agabo
            </span>
          )}
        </div>
      </div>

      {/* Navigation — con scroll propio cuando el menú supera la altura */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 space-y-1">
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
                    .filter(isAllowed)
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end ?? item.to === '/'}
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
