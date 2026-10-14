import type { PurchaseReceipt, CreatePurchaseReceiptDTO } from '@/domain/models';

/** Filtros soportados por GET /api/purchase-receipts. */
export interface PurchaseReceiptQueryParams {
  orderId?: string;
  warehouseId?: string;
  /** Filtro exacto por número de recepción (purchase_receipt_code_text). */
  code?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Contrato de recepciones (purchases.purchase_receipt).
 *
 * Las recepciones son **inmutables** y **únicas por orden**: no hay update ni
 * delete, y una orden solo se recibe una vez (RN-PUR-010 / RN-PUR-011).
 */
export interface IPurchaseReceiptRepository {
  getAll(params?: PurchaseReceiptQueryParams): Promise<{ data: PurchaseReceipt[]; total: number }>;
  getById(id: string): Promise<PurchaseReceipt | null>;
  /** POST /api/purchase-receipts — genera el movimiento de entrada en inventory. */
  create(data: CreatePurchaseReceiptDTO): Promise<PurchaseReceipt>;
}
