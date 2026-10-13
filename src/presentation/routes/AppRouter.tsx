import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/presentation/features/auth/LoginPage';
import { ChangePasswordPage } from '@/presentation/features/auth/ChangePasswordPage';
import { DashboardPage } from '@/presentation/features/dashboard/DashboardPage';
import { ProductListPage } from '@/presentation/features/products';
import { SupplierListPage } from '@/presentation/features/suppliers/SupplierListPage';
import { SupplierFormPage } from '@/presentation/features/suppliers/SupplierFormPage';
import { BranchListPage } from '@/presentation/features/company/branches/BranchListPage';
import { BranchFormPage } from '@/presentation/features/company/branches/BranchFormPage';
import { WarehouseListPage } from '@/presentation/features/company/warehouses/WarehouseListPage';
import { WarehouseFormPage } from '@/presentation/features/company/warehouses/WarehouseFormPage';
import { LocationListPage } from '@/presentation/features/company/locations/LocationListPage';
import { LocationFormPage } from '@/presentation/features/company/locations/LocationFormPage';
import { MovementsPage } from '@/presentation/features/inventory/MovementsPage';
import { MetricsPage } from '@/presentation/features/metrics/MetricsPage';
import { AppShell } from '@/presentation/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductListPage />} />

          <Route path="/suppliers" element={<SupplierListPage />} />
          <Route path="/suppliers/new" element={<SupplierFormPage />} />
          <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />

          {/* Módulo Empresa (solo super_admin): jerarquía company → branch → warehouse → location */}
          <Route element={<RoleGuard allowedRoles={['super_admin']} />}>
            <Route path="/company/branches" element={<BranchListPage />} />
            <Route path="/company/branches/new" element={<BranchFormPage />} />
            <Route path="/company/branches/:id/edit" element={<BranchFormPage />} />

            <Route path="/company/warehouses" element={<WarehouseListPage />} />
            <Route path="/company/warehouses/new" element={<WarehouseFormPage />} />
            <Route path="/company/warehouses/:id/edit" element={<WarehouseFormPage />} />

            <Route path="/company/locations" element={<LocationListPage />} />
            <Route path="/company/locations/new" element={<LocationFormPage />} />
            <Route path="/company/locations/:id/edit" element={<LocationFormPage />} />
          </Route>

          {/* super_admin y branch_admin pueden ver inventario */}
          <Route element={<RoleGuard allowedRoles={['super_admin', 'branch_admin']} />}>
            <Route path="/inventory" element={<MovementsPage />} />
          </Route>

          <Route path="/metrics" element={<MetricsPage />} />

          {/* Cambio de contraseña del usuario autenticado */}
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
