import type { Profile, CreateProfileDTO, UpdateProfileDTO } from '@/domain/models';

/** Filtros de GET /api/profiles. */
export interface ProfileQueryParams {
  /** Búsqueda por profile_name_text. */
  name?: string;
  /** Filtro por estado (profile_is_active_bl); sin valor lista todos. */
  isActive?: boolean;
  /** Separa los perfiles de sistema (profile_is_system_bl). */
  isSystem?: boolean;
}

/**
 * Contrato de perfiles (security.profile).
 *
 * Un perfil agrupa permisos para asignarlos a usuarios. El perfil de sistema
 * está protegido y los perfiles se activan/desactivan en lugar de eliminarse.
 */
export interface IProfileRepository {
  getAll(params?: ProfileQueryParams): Promise<{ data: Profile[]; total: number }>;
  getById(id: string): Promise<Profile | null>;
  /** POST /api/profiles — la empresa sale del token. */
  create(data: CreateProfileDTO): Promise<Profile>;
  /** PATCH /api/profiles/{id} — solo nombre y descripción. */
  update(id: string, data: UpdateProfileDTO): Promise<Profile>;
  /** POST /api/profiles/{id}/activate|deactivate */
  setActive(id: string, isActive: boolean): Promise<Profile>;
  /**
   * PUT /api/profiles/{id}/permissions — reemplaza el conjunto completo.
   * Un perfil de sistema no puede quedarse sin permisos (RF-SEC-014).
   */
  replacePermissions(id: string, permissionIds: string[]): Promise<Profile>;
}
