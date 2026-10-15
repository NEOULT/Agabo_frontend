import type { Movement, MovementDetail } from '@/domain/models';

/** Contrato crudo de `inventory.movement_detail` (RF-INV-018). */
export interface ApiMovementDetail {
  movement_detail_uuid: string;
  inventory_movement_uuid: string;
  product_uuid: string;
  lot_uuid: string | null;
  origin_location_uuid: string | null;
  destination_location_uuid: string | null;
  movement_detail_quantity_num: number;
  movement_detail_created_at_tsz: string;
}

/**
 * Contrato crudo de GET/POST /api/inventory-movements.
 * El movimiento incluye sus líneas (`details`) anidadas.
 */
export interface ApiMovement {
  inventory_movement_uuid: string;
  company_uuid: string;
  movement_type_uuid: string;
  origin_warehouse_uuid: string | null;
  destination_warehouse_uuid: string | null;
  inventory_movement_reference_text: string | null;
  inventory_movement_note_text: string | null;
  reversed_movement_uuid: string | null;
  inventory_movement_created_at_tsz: string;
  details: ApiMovementDetail[];
}

/** Respuesta de GET /api/inventory-movements (lista). */
export interface ApiMovementListResponse {
  message: string;
  items: ApiMovement[];
}

export function toMovementDetail(apiDetail: ApiMovementDetail): MovementDetail {
  return {
    id: apiDetail.movement_detail_uuid,
    movement_id: apiDetail.inventory_movement_uuid,
    product_id: apiDetail.product_uuid,
    lot_id: apiDetail.lot_uuid ?? undefined,
    origin_location_id: apiDetail.origin_location_uuid ?? undefined,
    destination_location_id: apiDetail.destination_location_uuid ?? undefined,
    quantity: apiDetail.movement_detail_quantity_num,
    created_at: apiDetail.movement_detail_created_at_tsz,
  };
}

export function toMovement(apiMovement: ApiMovement): Movement {
  return {
    id: apiMovement.inventory_movement_uuid,
    company_id: apiMovement.company_uuid,
    movement_type_id: apiMovement.movement_type_uuid,
    origin_warehouse_id: apiMovement.origin_warehouse_uuid ?? undefined,
    destination_warehouse_id: apiMovement.destination_warehouse_uuid ?? undefined,
    reference: apiMovement.inventory_movement_reference_text ?? undefined,
    note: apiMovement.inventory_movement_note_text ?? undefined,
    reversed_movement_id: apiMovement.reversed_movement_uuid ?? undefined,
    created_at: apiMovement.inventory_movement_created_at_tsz,
    details: (apiMovement.details ?? []).map(toMovementDetail),
  };
}
