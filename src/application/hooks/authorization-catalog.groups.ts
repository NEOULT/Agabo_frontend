import type { CatalogModuleGroup, CatalogResourceGroup, Permission } from '@/domain/models';

/** Acumulador por recurso mientras se agrupa (antes de ordenar y aplanar). */
interface ResourceAccumulator {
  resource: string;
  /** Nombre del endpoint base (sin variante); da el nombre del recurso. */
  baseName?: string;
  firstCreatedAt: string;
  firstEndpointName: string;
  actions: Map<
    string,
    { action: string; action_name: string; action_sort_order: number; permissions: Permission[] }
  >;
}

/** Acumulador por módulo mientras se agrupa. */
interface ModuleAccumulator {
  module_code: string;
  module_name: string;
  module_sort_order: number;
  resources: Map<string, ResourceAccumulator>;
}

/** Fallback del nombre de un recurso sin endpoint base (`security.auth`). */
function humanizeResource(resource: string): string {
  const words = resource.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Agrupa los permisos del catálogo en módulo → recurso → acción.
 *
 * Un recurso puede tener varios endpoints para la misma acción (listar y
 * consultar por id son `read`), así que la acción reúne sus permisos y marcar
 * la acción asigna o retira todos a la vez. El orden lo fija el backend
 * (`module_sort_order_int`, orden de declaración del recurso y
 * `action_sort_order_int`); aquí solo se respeta.
 */
export function buildCatalogModules(permissions: Permission[]): CatalogModuleGroup[] {
  const byModule = new Map<string, ModuleAccumulator>();

  for (const permission of permissions) {
    const moduleAccumulator: ModuleAccumulator = byModule.get(permission.module_code) ?? {
      module_code: permission.module_code,
      module_name: permission.module_name,
      module_sort_order: permission.module_sort_order,
      resources: new Map<string, ResourceAccumulator>(),
    };
    byModule.set(permission.module_code, moduleAccumulator);

    const baseCode = `${permission.module_code}.${permission.resource}`;
    const resourceAccumulator: ResourceAccumulator =
      moduleAccumulator.resources.get(permission.resource) ?? {
        resource: permission.resource,
        firstCreatedAt: permission.endpoint_created_at,
        firstEndpointName: permission.endpoint_name,
        actions: new Map(),
      };
    moduleAccumulator.resources.set(permission.resource, resourceAccumulator);

    if (permission.endpoint_code === baseCode && !resourceAccumulator.baseName) {
      resourceAccumulator.baseName = permission.endpoint_name;
    }
    if (permission.endpoint_created_at < resourceAccumulator.firstCreatedAt) {
      resourceAccumulator.firstCreatedAt = permission.endpoint_created_at;
      resourceAccumulator.firstEndpointName = permission.endpoint_name;
    }

    const actionAccumulator = resourceAccumulator.actions.get(permission.action) ?? {
      action: permission.action,
      action_name: permission.action_name,
      action_sort_order: permission.action_sort_order,
      permissions: [],
    };
    resourceAccumulator.actions.set(permission.action, actionAccumulator);
    actionAccumulator.permissions.push(permission);
  }

  return [...byModule.values()]
    .sort(
      (a, b) =>
        a.module_sort_order - b.module_sort_order || a.module_code.localeCompare(b.module_code),
    )
    .map((moduleAccumulator) => ({
      module_code: moduleAccumulator.module_code,
      module_name: moduleAccumulator.module_name,
      resources: [...moduleAccumulator.resources.values()]
        .sort(
          (a, b) =>
            a.firstCreatedAt.localeCompare(b.firstCreatedAt) || a.resource.localeCompare(b.resource),
        )
        .map(
          (resourceAccumulator): CatalogResourceGroup => ({
            resource: resourceAccumulator.resource,
            resource_name:
              resourceAccumulator.baseName ?? humanizeResource(resourceAccumulator.resource),
            // Sin reordenar: el backend ya entrega las acciones en orden de
            // negocio (declaracion del endpoint y `action_sort_order_int`), el
            // mismo orden que usa `/api/auth/me`.
            actions: [...resourceAccumulator.actions.values()].map((actionAccumulator) => ({
              action: actionAccumulator.action,
              action_name: actionAccumulator.action_name,
              permissions: actionAccumulator.permissions,
            })),
          }),
        ),
    }));
}
