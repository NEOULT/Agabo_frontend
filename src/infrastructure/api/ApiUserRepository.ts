import type { IUserRepository, UserQueryParams } from '@/domain/repositories';
import type { SecurityUser, CreateUserDTO, UpdateUserDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toSecurityUser,
  type ApiSecurityUser,
  type ApiSecurityUserListResponse,
} from './security-user.mapper';

/**
 * Implementación REST de identidades (security.user) contra el backend Express
 * (ver `docs/schema-security/api-contract-identity.md`).
 *
 * Los usuarios no se eliminan: se activan/desactivan. La contraseña solo se
 * restablece por su endpoint dedicado y `username`/`company_uuid` no se
 * aceptan en PATCH.
 */
export class ApiUserRepository implements IUserRepository {
  async getAll(params?: UserQueryParams): Promise<{ data: SecurityUser[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string | boolean> = {};
      if (params?.username) query.user_username_text = params.username;
      if (params?.email) query.user_email_text = params.email;
      if (params?.isActive !== undefined) query.user_is_active_bl = params.isActive;

      const { data } = await api.get<ApiSecurityUserListResponse>('/users', { params: query });

      return { data: data.items.map(toSecurityUser), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<SecurityUser | null> {
    try {
      const { data } = await api.get<ApiSecurityUserListResponse>('/users', {
        params: { user_uuid: id },
      });
      const item = data.items[0];
      return item ? toSecurityUser(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(user: CreateUserDTO): Promise<SecurityUser> {
    try {
      const { data } = await api.post<ApiSecurityUser>('/users', {
        user_username_text: user.username,
        user_email_text: user.email,
        user_password_text: user.password,
        user_first_name_text: user.first_name,
        user_last_name_text: user.last_name,
        user_phone_text: user.phone ?? null,
      });
      return toSecurityUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, changes: UpdateUserDTO): Promise<SecurityUser> {
    try {
      // PATCH es parcial: solo se envían los campos presentes.
      const payload: Record<string, string | null> = {};
      if (changes.email !== undefined) payload.user_email_text = changes.email;
      if (changes.first_name !== undefined) payload.user_first_name_text = changes.first_name;
      if (changes.last_name !== undefined) payload.user_last_name_text = changes.last_name;
      if (changes.phone !== undefined) payload.user_phone_text = changes.phone;

      const { data } = await api.patch<ApiSecurityUser>(`/users/${id}`, payload);
      return toSecurityUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string, isActive: boolean): Promise<SecurityUser> {
    try {
      const action = isActive ? 'activate' : 'deactivate';
      const { data } = await api.post<ApiSecurityUser>(`/users/${id}/${action}`);
      return toSecurityUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async resetPassword(id: string, password: string): Promise<SecurityUser> {
    try {
      const { data } = await api.patch<ApiSecurityUser>(`/users/${id}/password`, {
        user_password_text: password,
      });
      return toSecurityUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async replaceProfiles(id: string, profileIds: string[]): Promise<SecurityUser> {
    try {
      // La clave del cuerpo es la tabla de relación y la lista es la completa.
      const { data } = await api.put<ApiSecurityUser>(`/users/${id}/profiles`, {
        user_profiles: profileIds.map((profileUuid) => ({ profile_uuid: profileUuid })),
      });
      return toSecurityUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async replaceBranches(id: string, branchIds: string[]): Promise<SecurityUser> {
    try {
      const { data } = await api.put<ApiSecurityUser>(`/users/${id}/branches`, {
        user_branches: branchIds.map((branchUuid) => ({ branch_uuid: branchUuid })),
      });
      return toSecurityUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
