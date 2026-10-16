import type { SalePayment } from '@/domain/models';

/** Contrato crudo de GET/POST /api/payments del backend Express. */
export interface ApiPayment {
  payment_uuid: string;
  sale_uuid: string;
  payment_method_uuid: string;
  currency_uuid: string;
  payment_amount_num: number;
  payment_currency_amount_num: number;
  payment_exchange_rate_num: number;
  payment_is_active_bl: boolean;
  payment_created_at_tsz: string;
  payment_updated_at_tsz: string;
}

/** Respuesta de GET /api/payments (lista). */
export interface ApiPaymentListResponse {
  message: string;
  items: ApiPayment[];
}

/** Convierte el modelo crudo del backend al modelo de dominio SalePayment. */
export function toPayment(apiPayment: ApiPayment): SalePayment {
  return {
    id: apiPayment.payment_uuid,
    sale_id: apiPayment.sale_uuid,
    payment_method_id: apiPayment.payment_method_uuid,
    currency_id: apiPayment.currency_uuid,
    amount: apiPayment.payment_amount_num,
    currency_amount: apiPayment.payment_currency_amount_num,
    exchange_rate: apiPayment.payment_exchange_rate_num,
    is_active: apiPayment.payment_is_active_bl,
    created_at: apiPayment.payment_created_at_tsz,
    updated_at: apiPayment.payment_updated_at_tsz,
  };
}
