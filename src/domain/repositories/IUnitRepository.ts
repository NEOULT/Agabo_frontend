import type { Unit, CreateUnitDTO, UpdateUnitDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/** Filtros soportados por GET /api/units. */
export interface UnitQueryParams extends SearchParams {
  /** Filtro por estado (unit_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de unidades de medida (catalog.unit).
 * No existe `delete`: se activan/desactivan (RF-CAT-012).
 */
export interface IUnitRepository {
  getAll(params?: UnitQueryParams): Promise<{ data: Unit[]; total: number }>;
  getById(id: string): Promise<Unit | null>;
  create(data: CreateUnitDTO): Promise<Unit>;
  update(id: string, data: UpdateUnitDTO): Promise<Unit>;
  setActive(id: string): Promise<Unit>;
  setInactive(id: string): Promise<Unit>;
}
