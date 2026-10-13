/**
 * 🚛 Proveedor (purchases.supplier)
 *
 * Alineado al contrato (`docs/schema-purchases/api-contract-supplier.md`):
 * - Es una entidad por empresa: `code` es único dentro de la empresa.
 * - `code` NO es editable después de crear (RF-PUR-003).
 * - No se elimina: se activa/desactiva (RF-PUR-004, RF-PUR-014).
 * - La empresa se determina por el alcance del token.
 */
export interface Supplier {
  /** supplier_uuid */
  id: string;
  /** company_uuid — empresa propietaria del proveedor */
  company_id: string;
  /** supplier_code_text — único dentro de la empresa, inmutable */
  code: string;
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
  code: string;
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
}

/**
 * El backend solo acepta name, tax_id, email y phone en PATCH (RF-PUR-003).
 * `code` no es editable; el estado se cambia con activate/deactivate.
 */
export interface UpdateSupplierDTO {
  name?: string;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Producto que nos vende un proveedor específico (pendiente de integrar). */
export interface SupplierProduct {
  supplier_id: string;
  product_id: string;
  price: number;
  lead_time_days?: number;
}

/** Orden de compra a un proveedor (pendiente de integrar con el módulo purchases). */
export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  branch_id: string;
  status: 'pending' | 'received';
  items: PurchaseOrderItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
}

export interface CreatePurchaseOrderDTO {
  supplier_id: string;
  branch_id: string;
  items: Omit<PurchaseOrderItem, 'product_name'>[];
  notes?: string;
}
