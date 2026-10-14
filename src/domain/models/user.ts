import type { PermissionMap } from './permission';

export type UserRole = 'super_admin' | 'branch_admin' | 'viewer';

/** Perfil asignado al usuario en la empresa (security.profile). */
export interface UserProfile {
  profile_uuid: string;
  profile_name_text: string;
  /** profile_is_system_bl — el perfil de sistema equivale a super_admin. */
  profile_is_system_bl: boolean;
}

export interface User {
  id: string;
  /** company_uuid — empresa propietaria de los datos del usuario. */
  company_id: string;
  email: string;
  name: string;
  role: UserRole;
  branch_id?: string;
  is_active: boolean;
  created_at: string;
  /** Perfiles asignados al usuario (contrato del backend). */
  profiles: UserProfile[];
  /** UUIDs de las sucursales dentro del alcance del usuario (RF-SEC-025). */
  branches: string[];
}

/**
 * Credenciales de login con contraseña. El backend acepta username o correo
 * en un solo campo (user_identifier_text).
 */
export interface AuthCredentials {
  identifier: string;
  password: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  /** Expiración del access token en milisegundos (epoch). */
  expires_at: number;
  /**
   * Permisos efectivos de la sesión, agrupados por módulo y recurso
   * (`modules → <módulo> → <recurso> → [acciones]`). Es la vista declarativa
   * de la misma clave que evalúa el middleware (RF-SEC-021).
   */
  permissions: PermissionMap;
}
