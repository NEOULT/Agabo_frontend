/**
 * 👤 Cliente (sales.customer)
 *
 * Alineado al contrato (`docs/schema-sales/api-contract-customer.md`):
 * - Es una entidad **por empresa**; la empresa se determina por el token.
 * - No se elimina: se activa/desactiva (RF-SAL-004, RF-SAL-019).
 * - Un cliente inactivo no puede usarse en ventas nuevas, pero las ventas que
 *   ya lo referencian conservan su referencia.
 */
export interface Customer {
  /** customer_uuid */
  id: string;
  /** company_uuid — empresa propietaria del cliente */
  company_id: string;
  /** customer_name_text — nombre o razón social */
  name: string;
  /** customer_tax_id_text — identificación fiscal (RFC, NIT o equivalente) */
  tax_id?: string;
  /** customer_email_text */
  email?: string;
  /** customer_phone_text */
  phone?: string;
  /** customer_is_active_bl */
  is_active: boolean;
  /** customer_created_at_tsz */
  created_at: string;
  /** customer_updated_at_tsz */
  updated_at: string;
}

export interface CreateCustomerDTO {
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
}

/**
 * El backend solo acepta name, tax_id, email y phone en PATCH (RF-SAL-003).
 * El estado se cambia con activate/deactivate.
 */
export interface UpdateCustomerDTO {
  name?: string;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
}
