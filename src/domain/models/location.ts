/**
 * 📍 Ubicación (company.location)
 *
 * Alineada al contrato (`docs/schema-company/api-contract-location.md`):
 * - Pertenece a un almacén (`warehouse_id`); no se puede mover de almacén.
 * - `code` es único DENTRO del almacén y se puede corregir al editar (la
 *   unicidad la valida el backend).
 * - No se elimina: se activa/desactiva (RF-COM-026).
 * - `type` es descriptivo y opcional (RN-COM-008).
 */
export interface Location {
  /** location_uuid */
  id: string;
  /** warehouse_uuid — almacén propietario de la ubicación */
  warehouse_id: string;
  /** location_code_text — único dentro del almacén */
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
 * El backend acepta code, name y type en PATCH (RF-COM-024).
 * `warehouse_id` se rechaza con 400 validation_error: una ubicación no cambia
 * de almacén (RF-COM-027).
 */
export interface UpdateLocationDTO {
  code?: string;
  name?: string;
  type?: string | null;
}
