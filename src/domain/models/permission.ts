/**
 * 🔐 Permisos y catálogo de autorización (`security`).
 *
 * Alineado a `docs/schema-security/api-contract-authorization-catalog.md`:
 * - La clave con la que el middleware autoriza sigue siendo `<ACCION> <ruta>`
 *   (RF-SEC-021), por ejemplo `GET /api/users`; no cambia en el backend.
 * - Lo que llega al cliente es la vista declarativa agrupada por módulo y
 *   recurso: `modules -> <módulo> -> <recurso> -> [acciones]`, por ejemplo
 *   `modules.security.users = ["read", "create", "update"]`.
 * - La interfaz autoriza con claves `<módulo>.<recurso>:<acción>`, equivalentes
 *   a esa vista (`security.users:create`).
 */

/** Módulos del catálogo de autorización (RF-SEC-028). */
export type PermissionModule =
  | 'company'
  | 'security'
  | 'catalog'
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'cash'
  | 'configuration'
  | 'audit';

/**
 * Acción semántica que agrupa los verbos HTTP de un recurso.
 *
 * Sale de la variante del endpoint si la tiene (`.activate` → `activate`) y,
 * si no, del verbo HTTP (`GET` → `read`, `POST` → `create`, `PATCH` → `update`,
 * `DELETE` → `delete`, `PUT` → `replace`).
 */
export type PermissionAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'replace'
  | 'activate'
  | 'deactivate'
  | 'read_balance'
  | 'reverse'
  | 'refresh_cache'
  | 'change_password'
  | 'logout_all'
  | 'update_branch_count'
  | 'assign_profiles'
  | 'assign_branches'
  | 'assign_permissions';

/**
 * Clave de permiso de la interfaz: `<módulo>.<recurso>:<acción>`.
 * Ejemplos: `company.branches:read`, `security.users:assign_profiles`.
 */
export type PermissionKey = `${PermissionModule}.${string}:${PermissionAction}`;

/** Mapa de permisos efectivos del usuario, tal como lo devuelve el backend. */
export interface PermissionMap {
  /** Módulos con al menos un permiso activo; los demás no aparecen. */
  modules: Partial<Record<PermissionModule, Record<string, PermissionAction[]>>>;
}

/**
 * 🔑 Permiso del catálogo de asignación (`GET /api/permissions`).
 *
 * Además de la identidad del permiso, el backend entrega el contexto con el
 * que la pantalla lo agrupa y lo etiqueta: el módulo, el recurso (derivado de
 * `endpoint_code_text`, con los mismos alias que `/api/auth/me`) y la acción
 * semántica (derivada de la variante del endpoint o del verbo HTTP).
 */
export interface Permission {
  /** permission_uuid */
  id: string;
  /** action_uuid */
  action_id: string;
  /** endpoint_uuid */
  endpoint_id: string;
  /** permission_name_text */
  name: string;
  /** permission_description_text */
  description?: string;
  /** permission_is_active_bl */
  is_active: boolean;
  /** permission_created_at_tsz */
  created_at: string;
  /** permission_updated_at_tsz */
  updated_at: string;
  /** module_code_text */
  module_code: string;
  /** module_name_text */
  module_name: string;
  /** module_sort_order_int */
  module_sort_order: number;
  /** endpoint_code_text (`<módulo>.<recurso>[.variante]`) */
  endpoint_code: string;
  /** endpoint_name_text */
  endpoint_name: string;
  /** endpoint_created_at_tsz — orden de declaración del recurso */
  endpoint_created_at: string;
  /** action_code_text (verbo HTTP) */
  action_code: string;
  /** action_name_text (`Consultar`, `Registrar`, ...) */
  action_name: string;
  /** action_sort_order_int */
  action_sort_order: number;
  /** Recurso derivado (`branches`, `movements`, `order_details`, ...) */
  resource: string;
  /** Acción semántica derivada (`read`, `create`, `activate`, ...) */
  action: string;
}

/** ⚡ Acción del catálogo: verbo HTTP admitido (GET, POST, PATCH, PUT, DELETE). */
export interface SecurityAction {
  /** action_uuid */
  id: string;
  /** action_code_text — el verbo HTTP */
  code: string;
  /** action_name_text */
  name: string;
  /** action_description_text */
  description?: string;
  /** action_is_active_bl */
  is_active: boolean;
}

/** 📦 Módulo del catálogo: agrupación funcional de endpoints. */
export interface SecurityModule {
  /** module_uuid */
  id: string;
  /** module_code_text — igual al nombre del schema (ej: security) */
  code: string;
  /** module_name_text */
  name: string;
  /** module_description_text */
  description?: string;
  /** module_is_active_bl */
  is_active: boolean;
}

/** 🔗 Endpoint protegido, identificado por su plantilla de ruta. */
export interface SecurityEndpoint {
  /** endpoint_uuid */
  id: string;
  /** module_uuid */
  module_id: string;
  /** endpoint_code_text — patrón <modulo>.<recurso> */
  code: string;
  /** endpoint_path_text — plantilla con dos puntos (ej: /api/users/:user_uuid) */
  path: string;
  /** endpoint_name_text */
  name: string;
  /** endpoint_description_text */
  description?: string;
  /** endpoint_is_active_bl */
  is_active: boolean;
}

/**
 * Acción de un recurso en el catálogo de asignación.
 *
 * Un recurso puede tener varios endpoints para la misma acción (por ejemplo
 * listar y consultar por id, ambos `read`), así que la acción agrupa todos sus
 * permisos: marcar la acción asigna o retira los dos a la vez.
 */
export interface CatalogAction {
  /** Acción semántica (`read`, `create`, `activate`, ...) */
  action: string;
  /** Etiqueta del catálogo (`Consultar`, `Registrar`, ...) */
  action_name: string;
  /** Permisos que representa la acción (uno por endpoint del recurso) */
  permissions: Permission[];
}

/** Recurso del catálogo: una fila de la pantalla de asignación. */
export interface CatalogResourceGroup {
  /** Recurso derivado (`branches`, `movements`, ...) */
  resource: string;
  /** Nombre del recurso (nombre del endpoint base, p. ej. "Sucursales") */
  resource_name: string;
  actions: CatalogAction[];
}

/** Módulo del catálogo con sus recursos, ya en orden de negocio. */
export interface CatalogModuleGroup {
  /** module_code_text */
  module_code: string;
  /** module_name_text */
  module_name: string;
  resources: CatalogResourceGroup[];
}
