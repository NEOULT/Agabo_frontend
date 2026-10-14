import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/presentation/features/auth/LoginPage';
import { ChangePasswordPage } from '@/presentation/features/auth/ChangePasswordPage';
import { DashboardPage } from '@/presentation/features/dashboard/DashboardPage';
import { ProductListPage } from '@/presentation/features/catalog/products/ProductListPage';
import { ProductFormPage } from '@/presentation/features/catalog/products/ProductFormPage';
import { ProductDetailPage } from '@/presentation/features/catalog/products/ProductDetailPage';
import { CategoryListPage } from '@/presentation/features/catalog/categories/CategoryListPage';
import { BrandListPage } from '@/presentation/features/catalog/brands/BrandListPage';
import { UnitListPage } from '@/presentation/features/catalog/units/UnitListPage';
import { SupplierListPage } from '@/presentation/features/suppliers/SupplierListPage';
import { SupplierFormPage } from '@/presentation/features/suppliers/SupplierFormPage';
import { BranchListPage } from '@/presentation/features/company/branches/BranchListPage';
import { BranchFormPage } from '@/presentation/features/company/branches/BranchFormPage';
import { WarehouseListPage } from '@/presentation/features/company/warehouses/WarehouseListPage';
import { WarehouseFormPage } from '@/presentation/features/company/warehouses/WarehouseFormPage';
import { LocationListPage } from '@/presentation/features/company/locations/LocationListPage';
import { LocationFormPage } from '@/presentation/features/company/locations/LocationFormPage';
import {
  PurchaseOrderListPage,
  PurchaseOrderFormPage,
  PurchaseOrderDetailPage,
  PurchaseReceiptListPage,
} from '@/presentation/features/purchases';
import {
  UserListPage,
  UserFormPage,
  ProfileListPage,
  ProfileFormPage,
} from '@/presentation/features/security';
import { MovementsPage } from '@/presentation/features/inventory/MovementsPage';
import { MetricsPage } from '@/presentation/features/metrics/MetricsPage';
import { AppShell } from '@/presentation/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { PermissionGuard } from './PermissionGuard';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
            <Route path="/catalog/products/:id/edit" element={<ProductFormPage />} />
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

          {/* Módulo Inventario */}
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
