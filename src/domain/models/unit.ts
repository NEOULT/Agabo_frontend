/**
 * 📏 Unidad de medida (catalog.unit)
 *
 * Es una entidad por empresa: cada empresa administra sus propias unidades.
 * No se elimina: se activa/desactiva (RF-CAT-012).
 */
export interface Unit {
  /** unit_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** unit_name_text */
  name: string;
  /** unit_abbreviation_text */
  abbreviation?: string;
  /** unit_is_active_bl */
  is_active: boolean;
  /** unit_created_at_tsz */
  created_at: string;
  /** unit_updated_at_tsz */
  updated_at: string;
}

export interface CreateUnitDTO {
  name: string;
  abbreviation?: string;
}

/** El backend solo acepta name y abbreviation en PATCH. */
export interface UpdateUnitDTO {
  name?: string;
  abbreviation?: string | null;
}
