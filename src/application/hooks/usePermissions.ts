import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/application/stores/useAuthStore';
import type { PermissionAction, PermissionKey, PermissionMap, PermissionModule, UserRole } from '@/domain/models';

/** Clave de permiso ya separada en módulo, recurso y acción. */
type ParsedPermissionKey = {
  module: PermissionModule;
  resource: string;
  action: PermissionAction;
};

/** Separa una clave de permiso (`<módulo>.<recurso>:<acción>`) en sus partes. */
function splitKey(key: string): ParsedPermissionKey | null {
  const separatorIndex = key.indexOf(':');
  if (separatorIndex <= 0) return null;

  const action = key.slice(separatorIndex + 1).trim();
  const target = key.slice(0, separatorIndex).trim();
  const dotIndex = target.indexOf('.');
  if (dotIndex <= 0 || dotIndex === target.length - 1 || !action) return null;

  return {
    module: target.slice(0, dotIndex),
    resource: target.slice(dotIndex + 1),
    action,
  } as ParsedPermissionKey;
}

/**
 * Permisos efectivos del usuario autenticado.
 *
 * El backend entrega la vista agrupada (`módulo → recurso → [acciones]`) en el
 * login y en `GET /api/auth/me`; aquí se evalúa con claves
 * `<módulo>.<recurso>:<acción>`, equivalentes a las que valida el middleware
 * (`<ACCION> <ruta>`, RF-SEC-021).
 *
 * `hasMap` distingue "sin permisos" de "el backend no envió el mapa": si viene
 * vacío, la interfaz cae al respaldo por rol (`fallbackRoles`).
 */
export function usePermissions() {
  const permissions = useAuthStore((state) => state.permissions);
  const role = useAuthStore((state) => state.user?.role);

  const modules = permissions.modules;

  const hasMap = useMemo(() => Object.keys(modules ?? {}).length > 0, [modules]);

  const can = useCallback(
    (key: PermissionKey): boolean => {
      const parsed = splitKey(key);
      if (!parsed) return false;

      const modulePermissions = modules?.[parsed.module];
      return modulePermissions?.[parsed.resource]?.includes(parsed.action) ?? false;
    },
    [modules],
  );

  const canAny = useCallback(
    (keys: PermissionKey[]): boolean => keys.some((key) => can(key)),
    [can],
  );

  const canAll = useCallback(
    (keys: PermissionKey[]): boolean => keys.every((key) => can(key)),
    [can],
  );

  /**
   * Autorización de la interfaz: por permiso real y, si el mapa no llegó,
   * por rol (respaldo mientras el backend no lo envíe).
   */
  const canWithFallback = useCallback(
    (keys: PermissionKey[], fallbackRoles: UserRole[] = []): boolean => {
      if (!hasMap) return !!role && fallbackRoles.includes(role);
      return canAny(keys);
    },
    [hasMap, role, canAny],
  );

  return { permissions, hasMap, role, can, canAny, canAll, canWithFallback };
}

/** Permisos efectivos (mapa crudo) para consumidores que solo necesitan el dato. */
export function usePermissionMap(): PermissionMap {
  return useAuthStore((state) => state.permissions);
}
