/**
 * 🚛 Proveedor (purchases.supplier)
 *
 * Alineado al contrato (`docs/schema-purchases/api-contract-supplier.md`):
 * - Es una entidad por empresa.
 * - No se elimina: se activa/desactiva (RF-PUR-004, RF-PUR-014).
 * - La empresa se determina por el alcance del token.
 */
export interface Supplier {
  /** supplier_uuid */
  id: string;
  /** company_uuid — empresa propietaria del proveedor */
  company_id: string;
  /** supplier_name_text */
  name: string;
  /** supplier_tax_id_text — RIF/NIT u otro identificador fiscal */
  tax_id?: string;
  /** supplier_email_text */
  email?: string;
  /** supplier_phone_text */
  phone?: string;
  /** supplier_is_active_bl */
  is_active: boolean;
  /** supplier_created_at_tsz */
  created_at: string;
  /** supplier_updated_at_tsz */
  updated_at: string;
}

export interface CreateSupplierDTO {
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
}

/**
 * El backend solo acepta name, tax_id, email y phone en PATCH (RF-PUR-003).
 * El estado se cambia con activate/deactivate.
 */
export interface UpdateSupplierDTO {
  name?: string;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
}
