import type { SecurityUser, UserProfile } from '@/domain/models';

/**
 * Contrato crudo de /api/users del backend Express.
 * Los nombres de campo siguen la convención de columnas del proyecto.
 */
export interface ApiSecurityUser {
  user_uuid: string;
  company_uuid: string;
  user_username_text: string;
  user_email_text: string | null;
  user_first_name_text: string | null;
  user_last_name_text: string | null;
  user_phone_text: string | null;
  user_is_active_bl: boolean;
  created_by_uuid: string | null;
  user_created_at_tsz: string;
  user_updated_at_tsz: string | null;
  profiles: ApiUserProfileRef[];
  branches: string[];
}

/** Referencia de perfil anidada en el usuario (security.profile). */
export interface ApiUserProfileRef {
  profile_uuid: string;
  profile_name_text: string;
  profile_is_system_bl: boolean;
}

export interface ApiSecurityUserListResponse {
  message: string;
  items: ApiSecurityUser[];
}

function toUserProfile(profile: ApiUserProfileRef): UserProfile {
  return {
    profile_uuid: profile.profile_uuid,
    profile_name_text: profile.profile_name_text,
    profile_is_system_bl: profile.profile_is_system_bl,
  };
}

/** Convierte el modelo crudo del backend al modelo de dominio SecurityUser. */
export function toSecurityUser(apiUser: ApiSecurityUser): SecurityUser {
  return {
    id: apiUser.user_uuid,
    company_id: apiUser.company_uuid,
    username: apiUser.user_username_text,
    email: apiUser.user_email_text ?? undefined,
    first_name: apiUser.user_first_name_text ?? undefined,
    last_name: apiUser.user_last_name_text ?? undefined,
    phone: apiUser.user_phone_text ?? undefined,
    is_active: apiUser.user_is_active_bl,
    created_by: apiUser.created_by_uuid ?? undefined,
    created_at: apiUser.user_created_at_tsz,
    updated_at: apiUser.user_updated_at_tsz ?? undefined,
    profiles: (apiUser.profiles ?? []).map(toUserProfile),
    branches: apiUser.branches ?? [],
  };
}
