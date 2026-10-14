/**
 * 🏪 Sucursal (company.branch)
 *
 * Alineado al contrato del backend (`docs/schema-company/api-contract-branch.md`):
 * - Cada sucursal pertenece a una empresa (`company_id`).
 * - Las sucursales no se eliminan: se activan/desactivan (RN-COM-016).
 */
export interface Branch {
  /** branch_uuid */
  id: string;
  /** company_uuid — empresa propietaria de la sucursal */
  company_id: string;
  /** branch_name_text */
  name: string;
  /** branch_address_text */
  address?: string;
  /** branch_phone_text */
  phone?: string;
  /** branch_is_active_bl */
  is_active: boolean;
  /** branch_created_at_tsz */
  created_at: string;
  /** branch_updated_at_tsz */
  updated_at: string;
}

export interface CreateBranchDTO {
  company_id: string;
  name: string;
  address?: string;
  phone?: string;
}

/**
 * El backend solo acepta nombre, dirección y teléfono en PATCH (RF-COM-015).
 * El estado se cambia con los endpoints dedicados activate/deactivate.
 */
export interface UpdateBranchDTO {
  name?: string;
  address?: string | null;
  phone?: string | null;
}
