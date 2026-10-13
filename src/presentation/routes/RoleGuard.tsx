import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/application/stores/useAuthStore';
import type { UserRole } from '@/domain/models';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
