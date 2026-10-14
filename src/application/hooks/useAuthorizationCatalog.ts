import { useCallback, useMemo, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { CatalogModuleGroup, Permission } from '@/domain/models';
import { buildCatalogModules } from './authorization-catalog.groups';

/**
 * Catálogo de autorización (solo lectura) para la pantalla de asignación de
 * permisos de un perfil (RF-SEC-010 y RF-SEC-012).
 *
 * Se carga con **una sola llamada**: `GET /api/permissions` ya devuelve cada
 * permiso con su módulo, su recurso y su acción, derivados en el backend con la
 * misma regla que `/api/auth/me`. El agrupamiento (módulo → recurso → acción)
 * vive en `buildCatalogModules`.
 */
export function useAuthorizationCatalog() {
  const { authorizationCatalog } = useRepositories();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Carga el catálogo de permisos activos con una sola petición. */
  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await authorizationCatalog.listPermissions({ isActive: true });
      setPermissions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el catálogo de permisos');
    } finally {
      setIsLoading(false);
    }
  }, [authorizationCatalog]);

  const modules: CatalogModuleGroup[] = useMemo(
    () => buildCatalogModules(permissions),
    [permissions],
  );

  return { modules, isLoading, error, fetchCatalog };
}
