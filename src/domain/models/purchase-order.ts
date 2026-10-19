/**
 * 🧾 Orden de compra (purchases.purchase_order) y su detalle.
 *
 * Alineada al contrato (`docs/schema-purchases/api-contract-order.md`):
 * - Es **inmutable**: se registra una vez y no se edita ni se elimina (RN-PUR-011).
 * - No tiene `updated_at` (solo fecha de creación).
 * - El estado NO es una columna: se deriva de si tiene recepción
 *   (`pending` sin recepción / `received` con recepción, RN-PUR-017).
 * - El total y los importes de línea los calcula el backend (RN-PUR-006).
 */

/** Estado derivado de la orden (RF-PUR-017). */
export type PurchaseOrderStatus = 'pending' | 'received';

/** 📋 Línea de la orden: producto, cantidad y precio congelado. */
export interface PurchaseOrderDetail {
  /** purchase_order_detail_uuid */
  id: string;
  /** purchase_order_uuid */
  order_id: string;
  /** product_uuid */
  product_id: string;
  /** purchase_order_detail_quantity_num — > 0 */
  quantity: number;
  /** purchase_order_detail_unit_price_num — >= 0 */
  unit_price: number;
  /** purchase_order_detail_line_total_num — calculado por el backend */
  line_total: number;
  /** purchase_order_detail_created_at_tsz */
  created_at: string;
}

export interface PurchaseOrder {
  /** purchase_order_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** supplier_uuid */
  supplier_id: string;
  /** branch_uuid — sucursal de destino */
  branch_id: string;
  /** purchase_order_code_text — generado por el backend */
  code: string;
  /** purchase_order_total_num — suma de las líneas */
  total: number;
  /** purchase_order_note_text */
  note?: string;
  /** Estado derivado (pendiente / recibida) */
  status: PurchaseOrderStatus;
  /** Líneas de la orden */
  details: PurchaseOrderDetail[];
  /** Id de la recepción si la orden ya fue recibida (undefined si está pendiente). */
  receipt_id?: string;
  /** purchase_order_created_at_tsz */
  created_at: string;
}

/** Línea al crear una orden: sin importes calculados (los calcula el backend). */
export interface CreatePurchaseOrderDetailDTO {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreatePurchaseOrderDTO {
  supplier_id: string;
  branch_id: string;
  note?: string;
  details: CreatePurchaseOrderDetailDTO[];
}
