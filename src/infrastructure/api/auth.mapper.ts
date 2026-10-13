import type { User, UserProfile, UserRole, AuthSession } from '@/domain/models';

/**
 * Contratos crudos de la API del backend Express.
 * Los nombres de campo son los de la base de datos (convención del proyecto).
 */
export interface ApiPublicUser {
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
}

export interface ApiProfileRef {
  profile_uuid: string;
  profile_code_text: string;
  profile_name_text: string;
}

/** Respuesta de POST /api/auth/login. */
export interface ApiLoginResponse {
  message: string;
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  expires_at_tsz: string;
  session_refresh_text: string;
  refresh_expires_at_tsz: string;
  user: ApiPublicUser;
  profiles: ApiProfileRef[];
  branches: string[];
  permissions: Record<string, Record<string, string[]>>;
}

/**
 * El backend no tiene "roles": autoriza por perfiles y permisos. El frontend
 * sí usa roles para RoleGuard, así que se deriva uno provisional a partir de
 * los perfiles: el perfil de sistema (SISTEMA) equivale a super_admin.
 */
function deriveRole(profiles: ApiProfileRef[]): UserRole {
  if (profiles.some((profile) => profile.profile_code_text === 'SISTEMA')) {
    return 'super_admin';
  }

  return 'branch_admin';
}

function toUserProfile(profile: ApiProfileRef): UserProfile {
  return {
    profile_uuid: profile.profile_uuid,
    profile_code_text: profile.profile_code_text,
    profile_name_text: profile.profile_name_text,
  };
}

export function toUser(user: ApiPublicUser, profiles: ApiProfileRef[], branches: string[]): User {
  const fullName = [user.user_first_name_text, user.user_last_name_text].filter(Boolean).join(' ');

  return {
    id: user.user_uuid,
    email: user.user_email_text ?? '',
    name: fullName || user.user_username_text,
    role: deriveRole(profiles),
    is_active: user.user_is_active_bl,
    created_at: user.user_created_at_tsz,
    profiles: profiles.map(toUserProfile),
    branches,
  };
}

export function toAuthSession(response: ApiLoginResponse): AuthSession {
  return {
    user: toUser(response.user, response.profiles, response.branches),
    access_token: response.access_token,
    refresh_token: response.session_refresh_text,
    expires_at: Date.parse(response.expires_at_tsz),
  };
}
