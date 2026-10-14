import type { IProfileRepository, ProfileQueryParams } from '@/domain/repositories';
import type { Profile, CreateProfileDTO, UpdateProfileDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toProfile, type ApiProfile, type ApiProfileListResponse } from './profile.mapper';

/**
 * Implementación REST de perfiles (security.profile) contra el backend Express
 * (ver `docs/schema-security/api-contract-identity.md`).
 *
 * El perfil de sistema está protegido: el backend rechaza desactivarlo o
 * dejarlo sin permisos con `system_profile_protected` (RF-SEC-014).
 */
export class ApiProfileRepository implements IProfileRepository {
  async getAll(params?: ProfileQueryParams): Promise<{ data: Profile[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string | boolean> = {};
      if (params?.name) query.profile_name_text = params.name;
      if (params?.isActive !== undefined) query.profile_is_active_bl = params.isActive;
      if (params?.isSystem !== undefined) query.profile_is_system_bl = params.isSystem;

      const { data } = await api.get<ApiProfileListResponse>('/profiles', { params: query });

      return { data: data.items.map(toProfile), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Profile | null> {
    try {
      const { data } = await api.get<ApiProfileListResponse>('/profiles', {
        params: { profile_uuid: id },
      });
      const item = data.items[0];
      return item ? toProfile(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(profile: CreateProfileDTO): Promise<Profile> {
    try {
      const { data } = await api.post<ApiProfile>('/profiles', {
        profile_name_text: profile.name,
        profile_description_text: profile.description ?? null,
      });
      return toProfile(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, changes: UpdateProfileDTO): Promise<Profile> {
    try {
      const payload: Record<string, string | null> = {};
      if (changes.name !== undefined) payload.profile_name_text = changes.name;
      if (changes.description !== undefined) payload.profile_description_text = changes.description;

      const { data } = await api.patch<ApiProfile>(`/profiles/${id}`, payload);
      return toProfile(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Profile> {
    try {
      const action = isActive ? 'activate' : 'deactivate';
      const { data } = await api.post<ApiProfile>(`/profiles/${id}/${action}`);
      return toProfile(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async replacePermissions(id: string, permissionIds: string[]): Promise<Profile> {
    try {
      const { data } = await api.put<ApiProfile>(`/profiles/${id}/permissions`, {
        profile_permissions: permissionIds.map((permissionUuid) => ({
          permission_uuid: permissionUuid,
        })),
      });
      return toProfile(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
