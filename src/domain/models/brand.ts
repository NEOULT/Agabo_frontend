/**
 * 🏷️ Marca (catalog.brand)
 *
 * Entidad por empresa. No se elimina: se activa/desactiva (RF-CAT-008).
 */
export interface Brand {
  /** brand_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** brand_name_text */
  name: string;
  /** brand_is_active_bl */
  is_active: boolean;
  /** brand_created_at_tsz */
  created_at: string;
  /** brand_updated_at_tsz */
  updated_at: string;
}

export interface CreateBrandDTO {
  name: string;
}

/** El backend solo acepta name en PATCH (RF-CAT-007). */
export interface UpdateBrandDTO {
  name?: string;
}
