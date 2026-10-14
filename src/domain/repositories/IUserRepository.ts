import type { SecurityUser, CreateUserDTO, UpdateUserDTO } from '@/domain/models';

/**
 * Filtros de GET /api/users. La unicidad de usuario y correo es global
 * (RN-SEC-001), así que los filtros por username/email son coincidencia exacta.
 */
export interface UserQueryParams {
  /** Filtro exacto por user_username_text. */
  username?: string;
  /** Filtro exacto por user_email_text. */
  email?: string;
  /** Filtro por estado (user_is_active_bl); sin valor lista todos. */
  isActive?: boolean;
}

/**
 * Contrato de identidades (security.user).
 *
 * Los usuarios son inmutables en su identidad: `username` y `company_id` no se
 * editan, no se eliminan (se activan/desactivan) y la contraseña solo se
 * restablece por su endpoint dedicado.
 */
export interface IUserRepository {
  getAll(params?: UserQueryParams): Promise<{ data: SecurityUser[]; total: number }>;
  getById(id: string): Promise<SecurityUser | null>;
  /** POST /api/users — la empresa sale del token si no se indica. */
  create(data: CreateUserDTO): Promise<SecurityUser>;
  /** PATCH /api/users/{id} — solo email, nombres y teléfono. */
  update(id: string, data: UpdateUserDTO): Promise<SecurityUser>;
  /** POST /api/users/{id}/activate|deactivate */
  setActive(id: string, isActive: boolean): Promise<SecurityUser>;
  /**
   * PATCH /api/users/{id}/password — restablecimiento por administrador.
   * El backend revoca todas las sesiones del usuario (RN-SEC-019).
   */
  resetPassword(id: string, password: string): Promise<SecurityUser>;
  /** PUT /api/users/{id}/profiles — reemplaza el conjunto completo. */
  replaceProfiles(id: string, profileIds: string[]): Promise<SecurityUser>;
  /** PUT /api/users/{id}/branches — reemplaza el conjunto completo. */
  replaceBranches(id: string, branchIds: string[]): Promise<SecurityUser>;
}
