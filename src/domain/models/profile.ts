/**
 * 🎭 Perfil (security.profile).
 *
 * Alineado a `docs/schema-security/api-contract-identity.md`:
 * - El nombre identifica al perfil; el código se eliminó porque el usuario
 *   debía inventarlo y no aportaba nada.
 * - Un perfil de sistema (`is_system`) no puede desactivarse ni quedarse sin
 *   permisos (RF-SEC-014 y RN-SEC-005).
 * - Los perfiles no se eliminan: se activan/desactivan (RN-SEC-015).
 * - `permissions` es derivado de `security.profile_permission` y se devuelve
 *   completo, para poder mostrar y reenviar la asignación (RF-SEC-012).
 */
export interface ProfilePermission {
  /** permission_uuid */
  permission_uuid: string;
  /** permission_key_text — "<ACCION> <ruta>" */
  permission_key_text: string;
}

export interface Profile {
  /** profile_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** profile_name_text */
  name: string;
  /** profile_description_text */
  description?: string;
  /** profile_is_system_bl — protegido: no se desactiva ni se queda sin permisos */
  is_system: boolean;
  /** profile_is_active_bl */
  is_active: boolean;
  /** created_by_uuid */
  created_by?: string;
  /** profile_created_at_tsz */
  created_at: string;
  /** profile_updated_at_tsz */
  updated_at: string;
  /** Permisos asignados (security.profile_permission). */
  permissions: ProfilePermission[];
}

export interface CreateProfileDTO {
  name: string;
  description?: string;
}

/** El backend solo acepta name y description en PATCH (RF-SEC-011). */
export interface UpdateProfileDTO {
  name?: string;
  description?: string | null;
}
