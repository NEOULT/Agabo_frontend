/**
 * 🔄 Movimientos de inventario (`inventory`).
 *
 * Alineado al contrato (`docs/schema-inventory/api-contract-movement.md`):
 * - `inventory.movement_type`: el motivo del movimiento (compra, venta, ajuste,
 *   transferencia...). El tipo NO fija la dirección; esta se deduce de los
 *   almacenes de la cabecera (RN-INV-007).
 * - `inventory.inventory_movement`: la cabecera, inmutable una vez registrada
 *   (RN-INV-010). Lleva almacén de origen y/o destino.
 * - `inventory.movement_detail`: las líneas (producto, lote y cantidad) que
 *   viajan anidadas en el movimiento.
 */

/** Propósito reservado del tipo de movimiento (a lo sumo uno por empresa). */
export type MovementPurpose = 'sale_out' | 'purchase_in';

/** Motivo de un movimiento (`inventory.movement_type`). */
export interface MovementType {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  /** Proceso automático que lo usa (`sale_out`, `purchase_in`) o sin reserva. */
  purpose?: MovementPurpose;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMovementTypeDTO {
  name: string;
  description?: string | null;
  purpose?: MovementPurpose | null;
}

export interface UpdateMovementTypeDTO {
  name?: string;
  description?: string | null;
  purpose?: MovementPurpose | null;
}

/** Línea de un movimiento (`inventory.movement_detail`), inmutable. */
export interface MovementDetail {
  id: string;
  movement_id: string;
  product_id: string;
  lot_id?: string;
  quantity: number;
  created_at: string;
}

/**
 * Cabecera de un movimiento de inventario (`inventory.inventory_movement`).
 *
 * La dirección surge de los almacenes: solo destino es una entrada, solo
 * origen es una salida y ambos es una transferencia (RN-INV-008).
 */
export interface Movement {
  id: string;
  company_id: string;
  movement_type_id: string;
  origin_warehouse_id?: string;
  destination_warehouse_id?: string;
  reference?: string;
  note?: string;
  /** Movimiento que lo anuló (o el original, si este movimiento es la anulación). */
  reversed_movement_id?: string;
  created_at: string;
  details: MovementDetail[];
}

export interface CreateMovementDetailDTO {
  product_id: string;
  lot_id?: string | null;
  quantity: number;
}

export interface CreateMovementDTO {
  movement_type_id: string;
  /** Al menos uno de los dos almacenes es obligatorio (RN-INV-007). */
  origin_warehouse_id?: string | null;
  destination_warehouse_id?: string | null;
  reference?: string | null;
  note?: string | null;
  details: CreateMovementDetailDTO[];
}
