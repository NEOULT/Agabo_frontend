import type { Sale, SaleDetail, SalePaymentStatus } from '@/domain/models';
import { toPayment, type ApiPayment } from './payment.mapper';

/** Contrato crudo de `sales.sale_detail`. */
export interface ApiSaleDetail {
  sale_detail_uuid: string;
  sale_uuid: string;
  product_uuid: string;
  location_uuid: string | null;
  sale_detail_quantity_num: number;
  sale_detail_unit_price_num: number;
  sale_detail_line_total_num: number;
  sale_detail_created_at_tsz: string;
}

/**
 * Contrato crudo de GET/POST /api/sales.
 *
 * `payments` trae los pagos de la venta (activos e inactivos);
 * `paid_amount_num`, `balance_num` y `payment_status_text` los calcula el
 * backend a partir de los pagos activos (RN-SAL-006).
 */
export interface ApiSale {
  sale_uuid: string;
  company_uuid: string;
  branch_uuid: string;
  warehouse_uuid: string;
  customer_uuid: string | null;
  sale_code_text: string;
  sale_total_num: number;
  sale_note_text: string | null;
  sale_created_at_tsz: string;
  details: ApiSaleDetail[];
  payments: ApiPayment[];
  paid_amount_num: number;
  balance_num: number;
  payment_status_text: string;
}

export interface ApiSaleListResponse {
  message: string;
  items: ApiSale[];
}

export interface ApiSaleDetailListResponse {
  message: string;
  items: ApiSaleDetail[];
}

/** El backend emite 'pending' | 'partial' | 'paid'; se normaliza por seguridad. */
function toPaymentStatus(value: string): SalePaymentStatus {
  if (value === 'paid' || value === 'partial') return value;
  return 'pending';
}

export function toSaleDetail(apiDetail: ApiSaleDetail): SaleDetail {
  return {
    id: apiDetail.sale_detail_uuid,
    sale_id: apiDetail.sale_uuid,
    product_id: apiDetail.product_uuid,
    location_id: apiDetail.location_uuid ?? undefined,
    quantity: apiDetail.sale_detail_quantity_num,
    unit_price: apiDetail.sale_detail_unit_price_num,
    line_total: apiDetail.sale_detail_line_total_num,
    created_at: apiDetail.sale_detail_created_at_tsz,
  };
}

export function toSale(apiSale: ApiSale): Sale {
  return {
    id: apiSale.sale_uuid,
    company_id: apiSale.company_uuid,
    branch_id: apiSale.branch_uuid,
    warehouse_id: apiSale.warehouse_uuid,
    customer_id: apiSale.customer_uuid ?? undefined,
    code: apiSale.sale_code_text,
    total: apiSale.sale_total_num,
    paid_amount: apiSale.paid_amount_num,
    balance: apiSale.balance_num,
    payment_status: toPaymentStatus(apiSale.payment_status_text),
    note: apiSale.sale_note_text ?? undefined,
    created_at: apiSale.sale_created_at_tsz,
    details: (apiSale.details ?? []).map(toSaleDetail),
    payments: (apiSale.payments ?? []).map(toPayment),
  };
}
