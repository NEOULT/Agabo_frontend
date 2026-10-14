import type { Profile, ProfilePermission } from '@/domain/models';

/** Contrato crudo de /api/profiles del backend Express. */
export interface ApiProfile {
  profile_uuid: string;
  company_uuid: string;
  profile_name_text: string;
  profile_description_text: string | null;
  profile_is_system_bl: boolean;
  profile_is_active_bl: boolean;
  created_by_uuid: string | null;
  profile_created_at_tsz: string;
  profile_updated_at_tsz: string;
  permissions: ApiProfilePermission[];
}

/** Permiso asignado al perfil: uuid y clave derivada (`<ACCION> <ruta>`). */
export interface ApiProfilePermission {
  permission_uuid: string;
  permission_key_text: string;
}

export interface ApiProfileListResponse {
  message: string;
  items: ApiProfile[];
}

function toProfilePermission(permission: ApiProfilePermission): ProfilePermission {
  return {
    permission_uuid: permission.permission_uuid,
    permission_key_text: permission.permission_key_text,
  };
}

/** Convierte el modelo crudo del backend al modelo de dominio Profile. */
export function toProfile(apiProfile: ApiProfile): Profile {
  return {
    id: apiProfile.profile_uuid,
    company_id: apiProfile.company_uuid,
    name: apiProfile.profile_name_text,
    description: apiProfile.profile_description_text ?? undefined,
    is_system: apiProfile.profile_is_system_bl,
    is_active: apiProfile.profile_is_active_bl,
    created_by: apiProfile.created_by_uuid ?? undefined,
    created_at: apiProfile.profile_created_at_tsz,
    updated_at: apiProfile.profile_updated_at_tsz,
    permissions: (apiProfile.permissions ?? []).map(toProfilePermission),
  };
}
