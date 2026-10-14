import type { Permission, SecurityAction, SecurityModule, SecurityEndpoint } from '@/domain/models';

/**
 * Contratos crudos de /api/modules, /api/actions, /api/endpoints y
 * /api/permissions del backend Express.
 */

export interface ApiSecurityModule {
  module_uuid: string;
  module_code_text: string;
  module_name_text: string;
  module_description_text: string | null;
  module_is_active_bl: boolean;
  module_created_at_tsz: string;
  module_updated_at_tsz: string;
}

export interface ApiSecurityAction {
  action_uuid: string;
  action_code_text: string;
  action_name_text: string;
  action_description_text: string | null;
  action_is_active_bl: boolean;
  action_created_at_tsz: string;
  action_updated_at_tsz: string;
}

export interface ApiSecurityEndpoint {
  endpoint_uuid: string;
  module_uuid: string;
  endpoint_code_text: string;
  endpoint_path_text: string;
  endpoint_name_text: string;
  endpoint_description_text: string | null;
  endpoint_is_active_bl: boolean;
  endpoint_created_at_tsz: string;
  endpoint_updated_at_tsz: string;
}

/**
 * Item de `GET /api/permissions`. Además de la identidad del permiso, el
 * backend entrega su módulo, su recurso y su acción (derivados), para que la
 * pantalla de asignación se arme con una sola llamada.
 */
export interface ApiPermission {
  permission_uuid: string;
  action_uuid: string;
  endpoint_uuid: string;
  permission_name_text: string;
  permission_description_text: string | null;
  permission_is_active_bl: boolean;
  permission_created_at_tsz: string;
  permission_updated_at_tsz: string;
  module_code_text: string;
  module_name_text: string;
  module_sort_order_int: number;
  endpoint_code_text: string;
  endpoint_name_text: string;
  endpoint_created_at_tsz: string;
  action_code_text: string;
  action_name_text: string;
  action_sort_order_int: number;
  /** Recurso derivado (con los mismos alias que `/api/auth/me`). */
  resource: string;
  /** Acción semántica derivada. */
  action: string;
}

export interface ApiListResponse<T> {
  message: string;
  items: T[];
}

export function toSecurityModule(apiModule: ApiSecurityModule): SecurityModule {
  return {
    id: apiModule.module_uuid,
    code: apiModule.module_code_text,
    name: apiModule.module_name_text,
    description: apiModule.module_description_text ?? undefined,
    is_active: apiModule.module_is_active_bl,
  };
}

export function toSecurityAction(apiAction: ApiSecurityAction): SecurityAction {
  return {
    id: apiAction.action_uuid,
    code: apiAction.action_code_text,
    name: apiAction.action_name_text,
    description: apiAction.action_description_text ?? undefined,
    is_active: apiAction.action_is_active_bl,
  };
}

export function toSecurityEndpoint(apiEndpoint: ApiSecurityEndpoint): SecurityEndpoint {
  return {
    id: apiEndpoint.endpoint_uuid,
    module_id: apiEndpoint.module_uuid,
    code: apiEndpoint.endpoint_code_text,
    path: apiEndpoint.endpoint_path_text,
    name: apiEndpoint.endpoint_name_text,
    description: apiEndpoint.endpoint_description_text ?? undefined,
    is_active: apiEndpoint.endpoint_is_active_bl,
  };
}

export function toPermission(apiPermission: ApiPermission): Permission {
  return {
    id: apiPermission.permission_uuid,
    action_id: apiPermission.action_uuid,
    endpoint_id: apiPermission.endpoint_uuid,
    name: apiPermission.permission_name_text,
    description: apiPermission.permission_description_text ?? undefined,
    is_active: apiPermission.permission_is_active_bl,
    created_at: apiPermission.permission_created_at_tsz,
    updated_at: apiPermission.permission_updated_at_tsz,
    module_code: apiPermission.module_code_text,
    module_name: apiPermission.module_name_text,
    module_sort_order: apiPermission.module_sort_order_int,
    endpoint_code: apiPermission.endpoint_code_text,
    endpoint_name: apiPermission.endpoint_name_text,
    endpoint_created_at: apiPermission.endpoint_created_at_tsz,
    action_code: apiPermission.action_code_text,
    action_name: apiPermission.action_name_text,
    action_sort_order: apiPermission.action_sort_order_int,
    resource: apiPermission.resource,
    action: apiPermission.action,
  };
}
