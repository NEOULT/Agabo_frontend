import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@/application/hooks/usePermissions';
import type { PermissionKey, UserRole } from '@/domain/models';

interface PermissionGuardProps {
  /** Claves de permiso de la vista de sesión: `<módulo>.<recurso>:<acción>`. */
  permissions: PermissionKey[];
  /** Si el mapa de permisos no llega del backend, se autoriza por rol. */
  fallbackRoles?: UserRole[];
}

/**
 * Autoriza una rama de rutas con los permisos efectivos de la sesión.
 *
 * A diferencia de RoleGuard (rol derivado del perfil), aquí se evalúa el mismo
 * permiso que valida el middleware en el backend (RF-SEC-021), así que la
 * interfaz oculta exactamente lo que el backend va a rechazar.
 *
 * Si el mapa llega vacío (por ejemplo, sesión restaurada sin permisos) se cae
 * al respaldo por rol para no dejar la aplicación inutilizable.
 */
export function PermissionGuard({ permissions, fallbackRoles = [] }: PermissionGuardProps) {
  const { canWithFallback } = usePermissions();

  if (!canWithFallback(permissions, fallbackRoles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
