import { lazy, type ComponentType } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/presentation/features/auth/LoginPage';
import { AppShell } from '@/presentation/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { PermissionGuard } from './PermissionGuard';

/*
 * ⚡ División por ruta (code splitting): el bundle inicial solo trae login y
 * layout; cada página baja cuando se navega a ella. El login se queda eager
 * para pintar de inmediato. Menos bytes al arrancar y sin descargar pantallas
 * que el usuario quizá nunca abra.
 */
function page<T extends Record<string, unknown>>(
  loader: () => Promise<T>,
  name: keyof T & string,
) {
  return lazy(() =>
    loader().then((module) => ({ default: module[name] as ComponentType })),
  );
}

const ChangePasswordPage = page(() => import('@/presentation/features/auth/ChangePasswordPage'), 'ChangePasswordPage');

// Escaneo por teléfono: página pública (el token del QR es la credencial).
const PhoneScanPage = page(
  () => import('@/presentation/features/sales/pos/PhoneScanPage'),
  'PhoneScanPage',
);

// Dashboard
const DashboardPage = page(() => import('@/presentation/features/dashboard/DashboardPage'), 'DashboardPage');

// Catálogo
const ProductListPage = page(() => import('@/presentation/features/catalog/products/ProductListPage'), 'ProductListPage');
const ProductFormPage = page(() => import('@/presentation/features/catalog/products/ProductFormPage'), 'ProductFormPage');
const ProductDetailPage = page(() => import('@/presentation/features/catalog/products/ProductDetailPage'), 'ProductDetailPage');
const CategoryListPage = page(() => import('@/presentation/features/catalog/categories/CategoryListPage'), 'CategoryListPage');
const BrandListPage = page(() => import('@/presentation/features/catalog/brands/BrandListPage'), 'BrandListPage');
const UnitListPage = page(() => import('@/presentation/features/catalog/units/UnitListPage'), 'UnitListPage');
const PriceListListPage = page(() => import('@/presentation/features/catalog/prices/PriceListListPage'), 'PriceListListPage');
const PriceListDetailPage = page(() => import('@/presentation/features/catalog/prices/PriceListDetailPage'), 'PriceListDetailPage');

// Compras
const SupplierListPage = page(() => import('@/presentation/features/suppliers/SupplierListPage'), 'SupplierListPage');
const SupplierFormPage = page(() => import('@/presentation/features/suppliers/SupplierFormPage'), 'SupplierFormPage');
const PurchaseOrderListPage = page(() => import('@/presentation/features/purchases/orders/PurchaseOrderListPage'), 'PurchaseOrderListPage');
const PurchaseOrderFormPage = page(() => import('@/presentation/features/purchases/orders/PurchaseOrderFormPage'), 'PurchaseOrderFormPage');
const PurchaseOrderDetailPage = page(() => import('@/presentation/features/purchases/orders/PurchaseOrderDetailPage'), 'PurchaseOrderDetailPage');
const PurchaseReceiptListPage = page(() => import('@/presentation/features/purchases/receipts/PurchaseReceiptListPage'), 'PurchaseReceiptListPage');

// Ventas
const CustomerListPage = page(() => import('@/presentation/features/sales/customers/CustomerListPage'), 'CustomerListPage');
const CustomerFormPage = page(() => import('@/presentation/features/sales/customers/CustomerFormPage'), 'CustomerFormPage');
const PaymentMethodListPage = page(() => import('@/presentation/features/sales/payment-methods/PaymentMethodListPage'), 'PaymentMethodListPage');
const PaymentMethodFormPage = page(() => import('@/presentation/features/sales/payment-methods/PaymentMethodFormPage'), 'PaymentMethodFormPage');
const PointOfSalePage = page(() => import('@/presentation/features/sales/pos/PointOfSalePage'), 'PointOfSalePage');
const SaleListPage = page(() => import('@/presentation/features/sales/sales/SaleListPage'), 'SaleListPage');
const SaleDetailPage = page(() => import('@/presentation/features/sales/sales/SaleDetailPage'), 'SaleDetailPage');

// Empresa
const BranchListPage = page(() => import('@/presentation/features/company/branches/BranchListPage'), 'BranchListPage');
const BranchFormPage = page(() => import('@/presentation/features/company/branches/BranchFormPage'), 'BranchFormPage');
const WarehouseListPage = page(() => import('@/presentation/features/company/warehouses/WarehouseListPage'), 'WarehouseListPage');
const WarehouseFormPage = page(() => import('@/presentation/features/company/warehouses/WarehouseFormPage'), 'WarehouseFormPage');
const LocationListPage = page(() => import('@/presentation/features/company/locations/LocationListPage'), 'LocationListPage');
const LocationFormPage = page(() => import('@/presentation/features/company/locations/LocationFormPage'), 'LocationFormPage');
const CurrencyListPage = page(() => import('@/presentation/features/company/currencies/CurrencyListPage'), 'CurrencyListPage');

// Inventario
const MovementsPage = page(() => import('@/presentation/features/inventory/MovementsPage'), 'MovementsPage');
const MovementFormPage = page(() => import('@/presentation/features/inventory/MovementFormPage'), 'MovementFormPage');
const MovementTypesPage = page(() => import('@/presentation/features/inventory/MovementTypesPage'), 'MovementTypesPage');
const StockPage = page(() => import('@/presentation/features/inventory/StockPage'), 'StockPage');

// Seguridad
const UserListPage = page(() => import('@/presentation/features/security/users/UserListPage'), 'UserListPage');
const UserFormPage = page(() => import('@/presentation/features/security/users/UserFormPage'), 'UserFormPage');
const ProfileListPage = page(() => import('@/presentation/features/security/profiles/ProfileListPage'), 'ProfileListPage');
const ProfileFormPage = page(() => import('@/presentation/features/security/profiles/ProfileFormPage'), 'ProfileFormPage');

// Métricas
const MetricsPage = page(() => import('@/presentation/features/metrics/MetricsPage'), 'MetricsPage');

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* El teléfono abre este QR sin iniciar sesión: el token lo autoriza. */}
      <Route path="/scan/:token" element={<PhoneScanPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Módulo Catálogo: cada recurso se autoriza con su permiso de lectura.
              El respaldo por rol solo aplica si el mapa de permisos no llega. */}
          <Route
            element={
              <PermissionGuard
                permissions={['catalog.products:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/catalog/products" element={<ProductListPage />} />
            <Route path="/catalog/products/new" element={<ProductFormPage />} />
            <Route path="/catalog/products/:id" element={<ProductDetailPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['catalog.categories:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/catalog/categories" element={<CategoryListPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['catalog.brands:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/catalog/brands" element={<BrandListPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['catalog.units:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/catalog/units" element={<UnitListPage />} />
          </Route>

          {/* Listas de precios y sus precios por producto */}
          <Route
            element={
              <PermissionGuard
                permissions={['catalog.price_lists:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/catalog/price-lists" element={<PriceListListPage />} />
            <Route path="/catalog/price-lists/:id" element={<PriceListDetailPage />} />
          </Route>

          {/* Módulo Compras: proveedores, órdenes y recepciones */}
          <Route
            element={
              <PermissionGuard
                permissions={['purchases.suppliers:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/suppliers" element={<SupplierListPage />} />
            <Route path="/suppliers/new" element={<SupplierFormPage />} />
            <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['purchases.purchase_orders:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/purchases/orders" element={<PurchaseOrderListPage />} />
            <Route path="/purchases/orders/new" element={<PurchaseOrderFormPage />} />
            <Route path="/purchases/orders/:id" element={<PurchaseOrderDetailPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['purchases.purchase_receipts:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/purchases/receipts" element={<PurchaseReceiptListPage />} />
          </Route>

          {/* Módulo Ventas: clientes, métodos de pago, ventas y pagos */}
          <Route
            element={
              <PermissionGuard
                permissions={['sales.customers:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/sales/customers" element={<CustomerListPage />} />
            <Route path="/sales/customers/new" element={<CustomerFormPage />} />
            <Route path="/sales/customers/:id/edit" element={<CustomerFormPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['sales.payment_methods:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/sales/payment-methods" element={<PaymentMethodListPage />} />
            <Route path="/sales/payment-methods/new" element={<PaymentMethodFormPage />} />
            <Route path="/sales/payment-methods/:id/edit" element={<PaymentMethodFormPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['sales.sales:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            {/* La pestaña Ventas abre el punto de venta; el listado vive en el historial */}
            <Route path="/sales" element={<PointOfSalePage />} />
            <Route path="/sales/history" element={<SaleListPage />} />
            <Route path="/sales/history/:id" element={<SaleDetailPage />} />
          </Route>

          {/* Módulo Empresa: company → branch → warehouse → location */}
          <Route
            element={
              <PermissionGuard permissions={['company.branches:read']} fallbackRoles={['super_admin']} />
            }
          >
            <Route path="/company/branches" element={<BranchListPage />} />
            <Route path="/company/branches/new" element={<BranchFormPage />} />
            <Route path="/company/branches/:id/edit" element={<BranchFormPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['company.warehouses:read']}
                fallbackRoles={['super_admin']}
              />
            }
          >
            <Route path="/company/warehouses" element={<WarehouseListPage />} />
            <Route path="/company/warehouses/new" element={<WarehouseFormPage />} />
            <Route path="/company/warehouses/:id/edit" element={<WarehouseFormPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['company.locations:read']}
                fallbackRoles={['super_admin']}
              />
            }
          >
            <Route path="/company/locations" element={<LocationListPage />} />
            <Route path="/company/locations/new" element={<LocationFormPage />} />
            <Route path="/company/locations/:id/edit" element={<LocationFormPage />} />
          </Route>

          {/* Catálogo global de monedas (solo lectura) */}
          <Route
            element={
              <PermissionGuard
                permissions={['company.currencies:read']}
                fallbackRoles={['super_admin']}
              />
            }
          >
            <Route path="/company/currencies" element={<CurrencyListPage />} />
          </Route>

          {/* Módulo Inventario: movimientos (kardex), tipos de movimiento y existencias */}
          <Route
            element={
              <PermissionGuard
                permissions={['inventory.movements:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/inventory" element={<MovementsPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['inventory.movements:create']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/inventory/movements/new" element={<MovementFormPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['inventory.movement_types:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/inventory/movement-types" element={<MovementTypesPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['inventory.stocks:read']}
                fallbackRoles={['super_admin', 'branch_admin']}
              />
            }
          >
            <Route path="/inventory/stocks" element={<StockPage />} />
          </Route>

          {/* Módulo Seguridad: identidades y perfiles, autorizados por permiso real */}
          <Route
            element={
              <PermissionGuard permissions={['security.users:read']} fallbackRoles={['super_admin']} />
            }
          >
            <Route path="/security/users" element={<UserListPage />} />
            <Route path="/security/users/new" element={<UserFormPage />} />
            <Route path="/security/users/:id/edit" element={<UserFormPage />} />
          </Route>

          <Route
            element={
              <PermissionGuard
                permissions={['security.profiles:read']}
                fallbackRoles={['super_admin']}
              />
            }
          >
            <Route path="/security/profiles" element={<ProfileListPage />} />
            <Route path="/security/profiles/new" element={<ProfileFormPage />} />
            <Route path="/security/profiles/:id/edit" element={<ProfileFormPage />} />
          </Route>

          <Route path="/metrics" element={<MetricsPage />} />

          {/* Cambio de contraseña del usuario autenticado */}
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
