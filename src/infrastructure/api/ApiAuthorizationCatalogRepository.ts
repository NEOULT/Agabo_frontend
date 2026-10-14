import type {
  IAuthorizationCatalogRepository,
  PermissionQueryParams,
  SecurityEndpointQueryParams,
  SecurityActionQueryParams,
  ModuleQueryParams,
} from '@/domain/repositories';
import type { Permission, SecurityAction, SecurityModule, SecurityEndpoint } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toPermission,
  toSecurityAction,
  toSecurityEndpoint,
  toSecurityModule,
  type ApiListResponse,
  type ApiPermission,
  type ApiSecurityAction,
  type ApiSecurityEndpoint,
  type ApiSecurityModule,
} from './authorization-catalog.mapper';

/**
 * Implementación REST de lectura del catálogo de autorización contra el
 * backend Express (ver `docs/schema-security/api-contract-authorization-catalog.md`).
 *
 * `listPermissions` es la única llamada que necesita la pantalla de asignación:
 * el backend ya devuelve cada permiso con su módulo, su recurso y su acción, así
 * que no hay que cruzar el listado con `/modules`, `/actions` ni `/endpoints`.
 */
export class ApiAuthorizationCatalogRepository implements IAuthorizationCatalogRepository {
  async listPermissions(params?: PermissionQueryParams): Promise<Permission[]> {
    try {
      const query: Record<string, string | boolean> = {};
      if (params?.actionId) query.action_uuid = params.actionId;
      if (params?.endpointId) query.endpoint_uuid = params.endpointId;
      if (params?.isActive !== undefined) query.permission_is_active_bl = params.isActive;

      const { data } = await api.get<ApiListResponse<ApiPermission>>('/permissions', {
        params: query,
      });

      return data.items.map(toPermission);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async listActions(params?: SecurityActionQueryParams): Promise<SecurityAction[]> {
    try {
      const query: Record<string, boolean> = {};
      if (params?.isActive !== undefined) query.action_is_active_bl = params.isActive;

      const { data } = await api.get<ApiListResponse<ApiSecurityAction>>('/actions', {
        params: query,
      });
      return data.items.map(toSecurityAction);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async listModules(params?: ModuleQueryParams): Promise<SecurityModule[]> {
    try {
      const query: Record<string, boolean> = {};
      if (params?.isActive !== undefined) query.module_is_active_bl = params.isActive;

      const { data } = await api.get<ApiListResponse<ApiSecurityModule>>('/modules', {
        params: query,
      });
      return data.items.map(toSecurityModule);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async listEndpoints(params?: SecurityEndpointQueryParams): Promise<SecurityEndpoint[]> {
    try {
      const query: Record<string, string | boolean> = {};
      if (params?.moduleId) query.module_uuid = params.moduleId;
      if (params?.isActive !== undefined) query.endpoint_is_active_bl = params.isActive;

      const { data } = await api.get<ApiListResponse<ApiSecurityEndpoint>>('/endpoints', {
        params: query,
      });
      return data.items.map(toSecurityEndpoint);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
