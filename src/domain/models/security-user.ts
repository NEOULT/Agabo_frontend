import type { UserProfile } from './user';

/**
 * 👤 Usuario gestionado (security.user) — vista de administración.
 *
 * Alineado a `docs/schema-security/api-contract-identity.md`:
 * - `username` y `company_id` NO son editables después de crear (RF-SEC-017).
 * - `email` es único globalmente (RN-SEC-001).
 * - Los usuarios no se eliminan: se activan/desactivan (RF-SEC-018).
 * - `profiles` (security.user_profile) y `branches` (security.user_branch)
 *   son datos derivados que se reemplazan completos con PUT.
 * - El modelo nunca incluye el hash de la contraseña (RN-SEC-003).
 *
 * Se distingue de `User` (sesión): ese es la vista del usuario autenticado,
 * con rol y permisos resueltos para la interfaz.
 */
export interface SecurityUser {
  /** user_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** user_username_text — único globalmente, inmutable */
  username: string;
  /** user_email_text */
  email?: string;
  /** user_first_name_text */
  first_name?: string;
  /** user_last_name_text */
  last_name?: string;
  /** user_phone_text */
  phone?: string;
  /** user_is_active_bl */
  is_active: boolean;
  /** created_by_uuid — quién lo registró */
  created_by?: string;
  /** user_created_at_tsz */
  created_at: string;
  /** user_updated_at_tsz */
  updated_at?: string;
  /** Perfiles asignados (security.user_profile). */
  profiles: UserProfile[];
  /** UUIDs de sucursales asignadas (security.user_branch). */
  branches: string[];
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

/**
 * El backend solo acepta email, nombres y teléfono en PATCH (RF-SEC-017).
 * `username` y `company_id` se rechazan; el estado se cambia con
 * activate/deactivate y la contraseña con el endpoint dedicado.
 */
export interface UpdateUserDTO {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
}
