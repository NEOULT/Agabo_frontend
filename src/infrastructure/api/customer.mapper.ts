import type { Customer } from '@/domain/models';

/** Contrato crudo de GET/POST/PATCH /api/customers del backend Express. */
export interface ApiCustomer {
  customer_uuid: string;
  company_uuid: string;
  customer_name_text: string;
  customer_tax_id_text: string | null;
  customer_email_text: string | null;
  customer_phone_text: string | null;
  customer_is_active_bl: boolean;
  customer_created_at_tsz: string;
  customer_updated_at_tsz: string;
}

/** Respuesta de GET /api/customers (lista). */
export interface ApiCustomerListResponse {
  message: string;
  items: ApiCustomer[];
}

/** Convierte el modelo crudo del backend al modelo de dominio Customer. */
export function toCustomer(apiCustomer: ApiCustomer): Customer {
  return {
    id: apiCustomer.customer_uuid,
    company_id: apiCustomer.company_uuid,
    name: apiCustomer.customer_name_text,
    tax_id: apiCustomer.customer_tax_id_text ?? undefined,
    email: apiCustomer.customer_email_text ?? undefined,
    phone: apiCustomer.customer_phone_text ?? undefined,
    is_active: apiCustomer.customer_is_active_bl,
    created_at: apiCustomer.customer_created_at_tsz,
    updated_at: apiCustomer.customer_updated_at_tsz,
  };
}
