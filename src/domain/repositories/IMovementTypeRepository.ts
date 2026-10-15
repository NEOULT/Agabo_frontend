import type {
  MovementType,
  CreateMovementTypeDTO,
  UpdateMovementTypeDTO,
} from '@/domain/models';
import type { PaginationParams, SearchParams } from '@/shared/types/common';

/** Filtros de `GET /api/movement-types` (RF-INV-002). */
export interface MovementTypeQueryParams extends PaginationParams, SearchParams {
  /** Filtra por propósito reservado (`sale_out`, `purchase_in`). */
  purpose?: string;
  /** Filtra por estado (movement_type_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de tipos de movimiento (`inventory.movement_type`).
 *
 * No existe `delete`: se usa `setActive` / `setInactive` (RF-INV-004). Un tipo
 * inactivo no puede usarse en movimientos nuevos.
 */
export interface IMovementTypeRepository {
  getAll(params?: MovementTypeQueryParams): Promise<{ data: MovementType[]; total: number }>;
  getById(id: string): Promise<MovementType | null>;
  create(data: CreateMovementTypeDTO): Promise<MovementType>;
  update(id: string, data: UpdateMovementTypeDTO): Promise<MovementType>;
  /** POST /api/movement-types/{id}/activate. */
  setActive(id: string): Promise<MovementType>;
  /** POST /api/movement-types/{id}/deactivate. */
  setInactive(id: string): Promise<MovementType>;
}
