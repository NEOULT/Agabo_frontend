import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/presentation/features/auth/LoginPage';
import { ChangePasswordPage } from '@/presentation/features/auth/ChangePasswordPage';
import { DashboardPage } from '@/presentation/features/dashboard/DashboardPage';
import { ProductListPage } from '@/presentation/features/products';
import { SupplierListPage } from '@/presentation/features/suppliers/SupplierListPage';
import { BranchListPage } from '@/presentation/features/branches/BranchListPage';
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

          {/* Solo super_admin puede gestionar sedes */}
          <Route element={<RoleGuard allowedRoles={['super_admin']} />}>
            <Route path="/branches" element={<BranchListPage />} />
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
