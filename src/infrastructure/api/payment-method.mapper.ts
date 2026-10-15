import type { PaymentMethod } from '@/domain/models';

/** Contrato crudo de GET/POST/PATCH /api/payment-methods del backend Express. */
export interface ApiPaymentMethod {
  payment_method_uuid: string;
  company_uuid: string;
  payment_method_name_text: string;
  payment_method_is_active_bl: boolean;
  payment_method_created_at_tsz: string;
  payment_method_updated_at_tsz: string;
}

/** Respuesta de GET /api/payment-methods (lista). */
export interface ApiPaymentMethodListResponse {
  message: string;
  items: ApiPaymentMethod[];
}

/** Convierte el modelo crudo del backend al modelo de dominio PaymentMethod. */
export function toPaymentMethod(apiPaymentMethod: ApiPaymentMethod): PaymentMethod {
  return {
    id: apiPaymentMethod.payment_method_uuid,
    company_id: apiPaymentMethod.company_uuid,
    name: apiPaymentMethod.payment_method_name_text,
    is_active: apiPaymentMethod.payment_method_is_active_bl,
    created_at: apiPaymentMethod.payment_method_created_at_tsz,
    updated_at: apiPaymentMethod.payment_method_updated_at_tsz,
  };
}
