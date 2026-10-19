import type { PurchaseOrderDetail } from './purchase-order';

/**
 * 📥 Recepción de compra (purchases.purchase_receipt).
 *
 * Alineada al contrato (`docs/schema-purchases/api-contract-receipt.md`):
 * - Es **inmutable** y **única por orden**: una orden se recibe una sola vez
 *   (RN-PUR-010). El backend rechaza la segunda con
 *   `purchase_order_already_received`.
 * - Al registrarse, el backend pide a `inventory` el movimiento de entrada
 *   (RF-PUR-016). Si la empresa no tiene un tipo de movimiento activo
 *   reservado al propósito `purchase_in`, responde
 *   `purchases_movement_type_missing`.
 * - `details` son las líneas de la orden recibida (solo lectura).
 */
export interface PurchaseReceipt {
  /** purchase_receipt_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** purchase_order_uuid */
  order_id: string;
  /** warehouse_uuid — almacén donde ingresó la mercancía */
  warehouse_id: string;
  /** purchase_receipt_code_text — generado por el backend */
  code: string;
  /** purchase_receipt_note_text */
  note?: string;
  /** purchase_receipt_created_at_tsz */
  created_at: string;
  /** Líneas de la orden recibida. */
  details: PurchaseOrderDetail[];
}

export interface CreatePurchaseReceiptDTO {
  order_id: string;
  warehouse_id: string;
  note?: string;
}
