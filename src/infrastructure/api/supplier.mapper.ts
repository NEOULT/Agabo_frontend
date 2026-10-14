import type { Supplier } from '@/domain/models';

/**
 * Contrato crudo de GET/POST/PATCH /api/suppliers del backend Express.
 * Los nombres de campo siguen la convención de columnas del proyecto.
 */
export interface ApiSupplier {
  supplier_uuid: string;
  company_uuid: string;
  supplier_name_text: string;
  supplier_tax_id_text: string | null;
  supplier_email_text: string | null;
  supplier_phone_text: string | null;
  supplier_is_active_bl: boolean;
  supplier_created_at_tsz: string;
  supplier_updated_at_tsz: string;
}

/** Respuesta de GET /api/suppliers (lista). */
export interface ApiSupplierListResponse {
  message: string;
  items: ApiSupplier[];
}

/** Convierte el modelo crudo del backend al modelo de dominio Supplier. */
export function toSupplier(apiSupplier: ApiSupplier): Supplier {
  return {
    id: apiSupplier.supplier_uuid,
    company_id: apiSupplier.company_uuid,
    name: apiSupplier.supplier_name_text,
    tax_id: apiSupplier.supplier_tax_id_text ?? undefined,
    email: apiSupplier.supplier_email_text ?? undefined,
    phone: apiSupplier.supplier_phone_text ?? undefined,
    is_active: apiSupplier.supplier_is_active_bl,
    created_at: apiSupplier.supplier_created_at_tsz,
    updated_at: apiSupplier.supplier_updated_at_tsz,
  };
}
