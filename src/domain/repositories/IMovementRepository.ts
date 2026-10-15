import type { Movement, CreateMovementDTO } from '@/domain/models';
import type { PaginationParams } from '@/shared/types/common';

/**
 * Filtros de `GET /api/inventory-movements` (RF-INV-015 y kardex RF-INV-024).
 * El backend los combina con AND.
 */
export interface MovementQueryParams extends PaginationParams {
  /** Filtra por tipo de movimiento (movement_type_uuid). */
  movementTypeId?: string;
  /** Filtra por almacén, en origen o destino (warehouse_uuid). */
  warehouseId?: string;
  /** Filtra por producto del detalle (product_uuid) — kardex. */
  productId?: string;
  /** Movimientos que anulan a otro (reversed_movement_uuid). */
  reversedMovementId?: string;
  /** Límite inferior por fecha de creación (ISO). */
  fromDate?: string;
  /** Límite superior por fecha de creación (ISO). */
  toDate?: string;
}

/**
 * Contrato de movimientos de inventario (`inventory.inventory_movement`).
 *
 * Un movimiento es inmutable: no se edita ni se elimina. Para corregirlo se
 * registra su anulación con `reverse` (RF-INV-016).
 */
export interface IMovementRepository {
  getAll(params?: MovementQueryParams): Promise<{ data: Movement[]; total: number }>;
  getById(id: string): Promise<Movement | null>;
  /** POST /api/inventory-movements — registra y actualiza existencias (RF-INV-017). */
  create(data: CreateMovementDTO): Promise<Movement>;
  /** POST /api/inventory-movements/{id}/reverse — movimiento inverso (RF-INV-016). */
  reverse(id: string, note?: string): Promise<Movement>;
  /**
   * Movimientos de un producto, más recientes primero (kardex, RF-INV-024).
   * Delega en `getAll` con el filtro `productId`.
   */
  getByProduct(
    productId: string,
    params?: MovementQueryParams,
  ): Promise<{ data: Movement[]; total: number }>;
}
