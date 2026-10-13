import type { IWarehouseRepository, WarehouseQueryParams } from '@/domain/repositories';
import type { Warehouse, CreateWarehouseDTO, UpdateWarehouseDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toWarehouse, type ApiWarehouse, type ApiWarehouseListResponse } from './warehouse.mapper';

/**
 * Implementación REST del repositorio de almacenes contra el backend Express
 * (módulo `company`, ver `docs/schema-company/api-contract-warehouse.md`).
 *
 * Notas del contrato:
 * - No hay paginación: GET /api/warehouses devuelve todos los ítems filtrados.
 * - No hay DELETE: se usan los endpoints dedicados activate/deactivate.
 * - El código SÍ es editable en PATCH (a diferencia de branch), pero el
 *   backend garantiza la unicidad dentro de la sucursal.
 * - `branch_uuid` no se acepta en PATCH: un almacén no cambia de sucursal.
 */
export class ApiWarehouseRepository implements IWarehouseRepository {
  async getAll(params?: WarehouseQueryParams): Promise<{ data: Warehouse[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400, así que solo se
      // envían los filtros realmente activos.
      const query: Record<string, string> = {};
      if (params?.search) query.warehouse_name_text = params.search;
      if (params?.branchId) query.branch_uuid = params.branchId;
      if (params?.code) query.warehouse_code_text = params.code;
      if (params?.type) query.warehouse_type_text = params.type;
      if (params?.isActive !== undefined) query.warehouse_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiWarehouseListResponse>('/warehouses', { params: query });

      return {
        data: data.items.map(toWarehouse),
        total: data.items.length,
      };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Warehouse | null> {
    try {
      const { data } = await api.get<ApiWarehouseListResponse>('/warehouses', {
        params: { warehouse_uuid: id },
      });

      const item = data.items[0];
      return item ? toWarehouse(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateWarehouseDTO): Promise<Warehouse> {
    try {
      const { data: created } = await api.post<ApiWarehouse>('/warehouses', {
        branch_uuid: data.branch_id,
        warehouse_code_text: data.code,
        warehouse_name_text: data.name,
        warehouse_type_text: data.type ?? null,
      });

      return toWarehouse(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateWarehouseDTO): Promise<Warehouse> {
    try {
      // El backend rechaza branch_uuid con 400; code/name/type son editables.
      // Solo se envían los campos que el usuario modificó.
      const payload: Record<string, string | null> = {};
      if (data.code !== undefined) payload.warehouse_code_text = data.code;
      if (data.name !== undefined) payload.warehouse_name_text = data.name;
      if (data.type !== undefined) payload.warehouse_type_text = data.type;

      const { data: updated } = await api.patch<ApiWarehouse>(`/warehouses/${id}`, payload);

      return toWarehouse(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Warehouse> {
    try {
      const { data } = await api.post<ApiWarehouse>(`/warehouses/${id}/activate`);
      return toWarehouse(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Warehouse> {
    try {
      const { data } = await api.post<ApiWarehouse>(`/warehouses/${id}/deactivate`);
      return toWarehouse(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
