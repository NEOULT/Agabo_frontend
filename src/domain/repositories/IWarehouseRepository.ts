import type { Warehouse, CreateWarehouseDTO, UpdateWarehouseDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/warehouses.
 * El backend combina los filtros enviados con AND.
 */
export interface WarehouseQueryParams extends SearchParams {
  /** Filtra por sucursal propietaria (branch_uuid). */
  branchId?: string;
  /** Filtro por tipo descriptivo (warehouse_type_text), coincidencia exacta. */
  type?: string;
  /** Filtro por estado (warehouse_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de almacenes contra el schema company.
 *
 * No existe `delete`: se usa `setActive` / `setInactive` (RF-COM-019/020).
 */
export interface IWarehouseRepository {
  getAll(params?: WarehouseQueryParams): Promise<{ data: Warehouse[]; total: number }>;
  getById(id: string): Promise<Warehouse | null>;
  create(data: CreateWarehouseDTO): Promise<Warehouse>;
  update(id: string, data: UpdateWarehouseDTO): Promise<Warehouse>;
  /** POST /api/warehouses/{warehouse_uuid}/activate — idempotente. */
  setActive(id: string): Promise<Warehouse>;
  /** POST /api/warehouses/{warehouse_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<Warehouse>;
}
