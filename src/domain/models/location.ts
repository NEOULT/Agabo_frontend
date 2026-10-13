/**
 * 📍 Ubicación (company.location)
 *
 * Alineada al contrato (`docs/schema-company/api-contract-location.md`):
 * - Pertenece a un almacén (`warehouse_id`); no se puede mover de almacén.
 * - `code` es único DENTRO del almacén y NO es editable (RF-COM-024 solo
 *   declara editables nombre y tipo).
 * - No se elimina: se activa/desactiva (RF-COM-026).
 * - `type` es descriptivo y opcional (RN-COM-008).
 */
export interface Location {
  /** location_uuid */
  id: string;
  /** warehouse_uuid — almacén propietario de la ubicación */
  warehouse_id: string;
  /** location_code_text — único dentro del almacén, inmutable */
  code: string;
  /** location_name_text */
  name: string;
  /** location_type_text — ej: almacenamiento, recepción, despacho, cuarentena */
  type?: string;
  /** location_is_active_bl */
  is_active: boolean;
  /** location_created_at_tsz */
  created_at: string;
  /** location_updated_at_tsz */
  updated_at: string;
}

export interface CreateLocationDTO {
  warehouse_id: string;
  code: string;
  name: string;
  type?: string;
}

/**
 * El backend solo acepta name y type en PATCH (RF-COM-024).
 * `code` y `warehouse_id` se rechazan con 400 validation_error.
 */
export interface UpdateLocationDTO {
  name?: string;
  type?: string | null;
}
