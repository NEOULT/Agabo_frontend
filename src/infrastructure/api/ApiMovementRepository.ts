import type { IMovementRepository, MovementQueryParams } from '@/domain/repositories';
import type { Movement, CreateMovementDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toMovement, type ApiMovement, type ApiMovementListResponse } from './movement.mapper';

/**
 * Implementación REST de `inventory.inventory_movement` contra el backend
 * Express (ver `docs/schema-inventory/api-contract-movement.md`).
 *
 * Un movimiento es inmutable: no se edita ni se elimina. Para corregirlo se
 * registra su anulación, que crea el movimiento inverso (RF-INV-016).
 */
export class ApiMovementRepository implements IMovementRepository {
  async getAll(params?: MovementQueryParams): Promise<{ data: Movement[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.movementTypeId) query.movement_type_uuid = params.movementTypeId;
      if (params?.warehouseId) query.warehouse_uuid = params.warehouseId;
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.reversedMovementId) query.reversed_movement_uuid = params.reversedMovementId;
      if (params?.fromDate) query.inventory_movement_created_at_tsz_from = params.fromDate;
      if (params?.toDate) query.inventory_movement_created_at_tsz_to = params.toDate;

      const { data } = await api.get<ApiMovementListResponse>('/inventory-movements', {
        params: query,
      });

      return { data: data.items.map(toMovement), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Movement | null> {
    try {
      const { data } = await api.get<ApiMovementListResponse>('/inventory-movements', {
        params: { inventory_movement_uuid: id },
      });
      const item = data.items[0];
      return item ? toMovement(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateMovementDTO): Promise<Movement> {
    try {
      const { data: created } = await api.post<ApiMovement>('/inventory-movements', {
        movement_type_uuid: data.movement_type_id,
        origin_warehouse_uuid: data.origin_warehouse_id ?? null,
        destination_warehouse_uuid: data.destination_warehouse_id ?? null,
        inventory_movement_reference_text: data.reference ?? null,
        inventory_movement_note_text: data.note ?? null,
        details: data.details.map((detail) => ({
          product_uuid: detail.product_id,
          lot_uuid: detail.lot_id ?? null,
          movement_detail_quantity_num: detail.quantity,
        })),
      });

      return toMovement(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async reverse(id: string, note?: string): Promise<Movement> {
    try {
      const { data } = await api.post<ApiMovement>(`/inventory-movements/${id}/reverse`, {
        inventory_movement_note_text: note ?? null,
      });
      return toMovement(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  getByProduct(
    productId: string,
    params?: MovementQueryParams,
  ): Promise<{ data: Movement[]; total: number }> {
    return this.getAll({ ...params, productId });
  }
}
