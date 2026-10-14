import type { Permission, SecurityModule, SecurityEndpoint, SecurityAction } from '@/domain/models';

/**
 * Filtros de GET /api/permissions.
 *
 * No se envía `module_uuid`: el contrato lo documenta, pero el backend valida
 * los filtros con `.unknown(false)` y solo acepta los cuatro de abajo, así que
 * filtrar por módulo se hace en el cliente (a través de los endpoints).
 */
export interface PermissionQueryParams {
  /** Filtro exacto por action_uuid. */
  actionId?: string;
  /** Filtro exacto por endpoint_uuid. */
  endpointId?: string;
  /** Filtro por estado (permission_is_active_bl). */
  isActive?: boolean;
}

/** Filtros de GET /api/endpoints. */
export interface SecurityEndpointQueryParams {
  /** Filtro exacto por module_uuid. */
  moduleId?: string;
  /** Filtro por estado (endpoint_is_active_bl). */
  isActive?: boolean;
}

export interface ModuleQueryParams {
  /** Filtro por estado (module_is_active_bl). */
  isActive?: boolean;
}

/** Filtros de GET /api/actions. */
export interface SecurityActionQueryParams {
  /** Filtro por estado (action_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de lectura del catálogo de autorización (RF-SEC-010).
 *
 * Solo consulta: es lo que necesita la pantalla de asignación de permisos de
 * un perfil. La administración del catálogo (alta y edición de módulos,
 * acciones, endpoints y permisos, más la recarga del mapa en memoria) queda
 * fuera del alcance de este repositorio.
 *
 * La pantalla de asignación se arma con `listPermissions`: el backend entrega
 * cada permiso con su módulo, su recurso y su acción, así que basta una llamada.
 * `listActions`, `listModules` y `listEndpoints` se mantienen para consultas
 * sueltas del catálogo.
 */
export interface IAuthorizationCatalogRepository {
  listPermissions(params?: PermissionQueryParams): Promise<Permission[]>;
  listActions(params?: SecurityActionQueryParams): Promise<SecurityAction[]>;
  listModules(params?: ModuleQueryParams): Promise<SecurityModule[]>;
  listEndpoints(params?: SecurityEndpointQueryParams): Promise<SecurityEndpoint[]>;
}
