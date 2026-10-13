import type { ILocationRepository, LocationQueryParams } from '@/domain/repositories';
import type { Location, CreateLocationDTO, UpdateLocationDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toLocation, type ApiLocation, type ApiLocationListResponse } from './location.mapper';

/**
 * Implementación REST del repositorio de ubicaciones contra el backend Express
 * (módulo `company`, ver `docs/schema-company/api-contract-location.md`).
 *
 * Notas del contrato:
 * - No hay paginación: GET /api/locations devuelve todos los ítems filtrados.
 * - No hay DELETE: se usan los endpoints dedicados activate/deactivate.
 * - El código NO es editable en PATCH (RF-COM-024): solo name y type.
 * - `warehouse_uuid` no se acepta en PATCH: una ubicación no cambia de almacén.
 */
export class ApiLocationRepository implements ILocationRepository {
  async getAll(params?: LocationQueryParams): Promise<{ data: Location[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400, así que solo se
      // envían los filtros realmente activos.
      const query: Record<string, string> = {};
      if (params?.search) query.location_name_text = params.search;
      if (params?.warehouseId) query.warehouse_uuid = params.warehouseId;
      if (params?.code) query.location_code_text = params.code;
      if (params?.type) query.location_type_text = params.type;
      if (params?.isActive !== undefined) query.location_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiLocationListResponse>('/locations', { params: query });

      return {
        data: data.items.map(toLocation),
        total: data.items.length,
      };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Location | null> {
    try {
      const { data } = await api.get<ApiLocationListResponse>('/locations', {
        params: { location_uuid: id },
      });

      const item = data.items[0];
      return item ? toLocation(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateLocationDTO): Promise<Location> {
    try {
      const { data: created } = await api.post<ApiLocation>('/locations', {
        warehouse_uuid: data.warehouse_id,
        location_code_text: data.code,
        location_name_text: data.name,
        location_type_text: data.type ?? null,
      });

      return toLocation(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateLocationDTO): Promise<Location> {
    try {
      // El backend rechaza warehouse_uuid y location_code_text con 400;
      // solo name y type son editables (RF-COM-024).
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.location_name_text = data.name;
      if (data.type !== undefined) payload.location_type_text = data.type;

      const { data: updated } = await api.patch<ApiLocation>(`/locations/${id}`, payload);

      return toLocation(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Location> {
    try {
      const { data } = await api.post<ApiLocation>(`/locations/${id}/activate`);
      return toLocation(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Location> {
    try {
      const { data } = await api.post<ApiLocation>(`/locations/${id}/deactivate`);
      return toLocation(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
