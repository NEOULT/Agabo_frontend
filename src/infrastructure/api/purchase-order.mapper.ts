import type { PurchaseOrder, PurchaseOrderDetail, PurchaseOrderStatus } from '@/domain/models';

/** Contrato crudo de `purchases.purchase_order_detail`. */
export interface ApiPurchaseOrderDetail {
  purchase_order_detail_uuid: string;
  purchase_order_uuid: string;
  product_uuid: string;
  purchase_order_detail_quantity_num: number;
  purchase_order_detail_unit_price_num: number;
  purchase_order_detail_line_total_num: number;
  purchase_order_detail_created_at_tsz: string;
}

/** Referencia mínima de la recepción anidada en la orden. */
export interface ApiReceiptRef {
  purchase_receipt_uuid: string;
}

/**
 * Contrato crudo de GET/POST /api/purchase-orders.
 * `receipt` es null mientras la orden está pendiente.
 */
export interface ApiPurchaseOrder {
  purchase_order_uuid: string;
  company_uuid: string;
  supplier_uuid: string;
  branch_uuid: string;
  purchase_order_code_text: string;
  purchase_order_total_num: number;
  purchase_order_note_text: string | null;
  purchase_order_created_at_tsz: string;
  details: ApiPurchaseOrderDetail[];
  receipt: ApiReceiptRef | null;
  purchase_order_status_text: string;
}

export interface ApiPurchaseOrderListResponse {
  message: string;
  items: ApiPurchaseOrder[];
}

export interface ApiPurchaseOrderDetailListResponse {
  message: string;
  items: ApiPurchaseOrderDetail[];
}

/** El backend solo emite 'pending' o 'received'; se normaliza por seguridad. */
function toStatus(value: string): PurchaseOrderStatus {
  return value === 'received' ? 'received' : 'pending';
}

export function toPurchaseOrderDetail(apiDetail: ApiPurchaseOrderDetail): PurchaseOrderDetail {
  return {
    id: apiDetail.purchase_order_detail_uuid,
    order_id: apiDetail.purchase_order_uuid,
    product_id: apiDetail.product_uuid,
    quantity: apiDetail.purchase_order_detail_quantity_num,
    unit_price: apiDetail.purchase_order_detail_unit_price_num,
    line_total: apiDetail.purchase_order_detail_line_total_num,
    created_at: apiDetail.purchase_order_detail_created_at_tsz,
  };
}

export function toPurchaseOrder(apiOrder: ApiPurchaseOrder): PurchaseOrder {
  return {
    id: apiOrder.purchase_order_uuid,
    company_id: apiOrder.company_uuid,
    supplier_id: apiOrder.supplier_uuid,
    branch_id: apiOrder.branch_uuid,
    code: apiOrder.purchase_order_code_text,
    total: apiOrder.purchase_order_total_num,
    note: apiOrder.purchase_order_note_text ?? undefined,
    status: toStatus(apiOrder.purchase_order_status_text),
    details: (apiOrder.details ?? []).map(toPurchaseOrderDetail),
    receipt_id: apiOrder.receipt?.purchase_receipt_uuid ?? undefined,
    created_at: apiOrder.purchase_order_created_at_tsz,
  };
}
