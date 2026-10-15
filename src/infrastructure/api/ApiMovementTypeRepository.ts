import type { IMovementTypeRepository, MovementTypeQueryParams } from '@/domain/repositories';
import type { MovementType, CreateMovementTypeDTO, UpdateMovementTypeDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toMovementType,
  type ApiMovementType,
  type ApiMovementTypeListResponse,
} from './movement-type.mapper';

/**
 * Implementación REST de `inventory.movement_type` contra el backend Express
 * (ver `docs/schema-inventory/api-contract-movement.md` §2).
 */
export class ApiMovementTypeRepository implements IMovementTypeRepository {
  async getAll(
    params?: MovementTypeQueryParams,
  ): Promise<{ data: MovementType[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.search) query.movement_type_name_text = params.search;
      if (params?.purpose) query.movement_type_purpose_text = params.purpose;
      if (params?.isActive !== undefined) {
        query.movement_type_is_active_bl = String(params.isActive);
      }

      const { data } = await api.get<ApiMovementTypeListResponse>('/movement-types', {
        params: query,
      });

      return { data: data.items.map(toMovementType), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<MovementType | null> {
    try {
      const { data } = await api.get<ApiMovementTypeListResponse>('/movement-types', {
        params: { movement_type_uuid: id },
      });
      const item = data.items[0];
      return item ? toMovementType(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateMovementTypeDTO): Promise<MovementType> {
    try {
      const { data: created } = await api.post<ApiMovementType>('/movement-types', {
        movement_type_name_text: data.name,
        movement_type_description_text: data.description ?? null,
        movement_type_purpose_text: data.purpose ?? null,
      });
      return toMovementType(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateMovementTypeDTO): Promise<MovementType> {
    try {
      // La descripción y el propósito son limpiables con null.
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.movement_type_name_text = data.name;
      if (data.description !== undefined) {
        payload.movement_type_description_text = data.description;
      }
      if (data.purpose !== undefined) payload.movement_type_purpose_text = data.purpose;

      const { data: updated } = await api.patch<ApiMovementType>(
        `/movement-types/${id}`,
        payload,
      );
      return toMovementType(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<MovementType> {
    try {
      const { data } = await api.post<ApiMovementType>(`/movement-types/${id}/activate`);
      return toMovementType(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<MovementType> {
    try {
      const { data } = await api.post<ApiMovementType>(`/movement-types/${id}/deactivate`);
      return toMovementType(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
