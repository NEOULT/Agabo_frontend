import type { Location, CreateLocationDTO, UpdateLocationDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/**
 * Filtros soportados por GET /api/locations.
 * El backend combina los filtros enviados con AND.
 */
export interface LocationQueryParams extends SearchParams {
  /** Filtra por almacén propietario (warehouse_uuid). */
  warehouseId?: string;
  /** Filtro exacto por código (location_code_text). */
  code?: string;
  /** Filtro por tipo descriptivo (location_type_text), coincidencia exacta. */
  type?: string;
  /** Filtro por estado (location_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de ubicaciones contra el schema company.
 *
 * No existe `delete`: se usa `setActive` / `setInactive` (RF-COM-025/026).
 */
export interface ILocationRepository {
  getAll(params?: LocationQueryParams): Promise<{ data: Location[]; total: number }>;
  getById(id: string): Promise<Location | null>;
  create(data: CreateLocationDTO): Promise<Location>;
  update(id: string, data: UpdateLocationDTO): Promise<Location>;
  /** POST /api/locations/{location_uuid}/activate — idempotente. */
  setActive(id: string): Promise<Location>;
  /** POST /api/locations/{location_uuid}/deactivate — idempotente. */
  setInactive(id: string): Promise<Location>;
}
