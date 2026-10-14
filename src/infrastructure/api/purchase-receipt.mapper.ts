import type { PurchaseReceipt } from '@/domain/models';
import { toPurchaseOrderDetail, type ApiPurchaseOrderDetail } from './purchase-order.mapper';

/** Contrato crudo de GET/POST /api/purchase-receipts. */
export interface ApiPurchaseReceipt {
  purchase_receipt_uuid: string;
  company_uuid: string;
  purchase_order_uuid: string;
  warehouse_uuid: string;
  location_uuid: string | null;
  purchase_receipt_code_text: string;
  purchase_receipt_note_text: string | null;
  purchase_receipt_created_at_tsz: string;
  details: ApiPurchaseOrderDetail[];
}

export interface ApiPurchaseReceiptListResponse {
  message: string;
  items: ApiPurchaseReceipt[];
}

export function toPurchaseReceipt(apiReceipt: ApiPurchaseReceipt): PurchaseReceipt {
  return {
    id: apiReceipt.purchase_receipt_uuid,
    company_id: apiReceipt.company_uuid,
    order_id: apiReceipt.purchase_order_uuid,
    warehouse_id: apiReceipt.warehouse_uuid,
    location_id: apiReceipt.location_uuid ?? undefined,
    code: apiReceipt.purchase_receipt_code_text,
    note: apiReceipt.purchase_receipt_note_text ?? undefined,
    created_at: apiReceipt.purchase_receipt_created_at_tsz,
    details: (apiReceipt.details ?? []).map(toPurchaseOrderDetail),
  };
}
