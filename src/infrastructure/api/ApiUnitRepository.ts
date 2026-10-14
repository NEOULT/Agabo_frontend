import type { IUnitRepository, UnitQueryParams } from '@/domain/repositories';
import type { Unit, CreateUnitDTO, UpdateUnitDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toUnit, type ApiUnit, type ApiUnitListResponse } from './unit.mapper';

/** Implementación REST de `catalog.unit` (ver api-contract-classification.md §4). */
export class ApiUnitRepository implements IUnitRepository {
  async getAll(params?: UnitQueryParams): Promise<{ data: Unit[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.search) query.unit_name_text = params.search;
      if (params?.isActive !== undefined) query.unit_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiUnitListResponse>('/units', { params: query });

      return { data: data.items.map(toUnit), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Unit | null> {
    try {
      const { data } = await api.get<ApiUnitListResponse>('/units', {
        params: { unit_uuid: id },
      });
      const item = data.items[0];
      return item ? toUnit(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateUnitDTO): Promise<Unit> {
    try {
      const { data: created } = await api.post<ApiUnit>('/units', {
        unit_name_text: data.name,
        unit_abbreviation_text: data.abbreviation ?? null,
      });
      return toUnit(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateUnitDTO): Promise<Unit> {
    try {
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.unit_name_text = data.name;
      if (data.abbreviation !== undefined) payload.unit_abbreviation_text = data.abbreviation;

      const { data: updated } = await api.patch<ApiUnit>(`/units/${id}`, payload);
      return toUnit(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Unit> {
    try {
      const { data } = await api.post<ApiUnit>(`/units/${id}/activate`);
      return toUnit(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Unit> {
    try {
      const { data } = await api.post<ApiUnit>(`/units/${id}/deactivate`);
      return toUnit(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
