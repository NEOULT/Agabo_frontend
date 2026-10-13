/**
 * 🏢 Almacén (company.warehouse)
 *
 * Alineado al contrato (`docs/schema-company/api-contract-warehouse.md`):
 * - Pertenece a una sucursal (`branch_id`); no se puede mover de sucursal.
 * - `code` es único DENTRO de la sucursal y sí es editable (RF-COM-018),
 *   a diferencia de branch donde el código es inmutable.
 * - No se elimina: se activa/desactiva (RF-COM-020).
 * - `type` es descriptivo y opcional; el catálogo se definirá después (RN-COM-008).
 */
export interface Warehouse {
  /** warehouse_uuid */
  id: string;
  /** branch_uuid — sucursal propietaria del almacén */
  branch_id: string;
  /** warehouse_code_text — único dentro de la sucursal */
  code: string;
  /** warehouse_name_text */
  name: string;
  /** warehouse_type_text — ej: principal, tránsito, devoluciones, cuarentena */
  type?: string;
  /** warehouse_is_active_bl */
  is_active: boolean;
  /** warehouse_created_at_tsz */
  created_at: string;
  /** warehouse_updated_at_tsz */
  updated_at: string;
}

export interface CreateWarehouseDTO {
  branch_id: string;
  code: string;
  name: string;
  type?: string;
}

/**
 * El backend acepta code, name y type en PATCH.
 * `branch_id` NO es editable: un almacén no cambia de sucursal (RF-COM-021).
 */
export interface UpdateWarehouseDTO {
  code?: string;
  name?: string;
  type?: string | null;
}
