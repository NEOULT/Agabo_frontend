/**
 * 🗂️ Categoría (catalog.category)
 *
 * Entidad por empresa, admite jerarquía vía `parent_id`.
 * No se elimina: se activa/desactiva. Desactivar falla si tiene productos
 * activos (`category_has_active_products`).
 */
export interface Category {
  /** category_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** parent_category_uuid — categoría padre opcional */
  parent_id?: string;
  /** category_name_text */
  name: string;
  /** category_is_active_bl */
  is_active: boolean;
  /** category_created_at_tsz */
  created_at: string;
  /** category_updated_at_tsz */
  updated_at: string;
}

export interface CreateCategoryDTO {
  name: string;
  parent_id?: string;
}

/**
 * El backend solo acepta name y parent_id en PATCH (RF-CAT-003).
 * Cambiar el padre se rechaza con `category_hierarchy_cycle` si crea un ciclo.
 */
export interface UpdateCategoryDTO {
  name?: string;
  parent_id?: string | null;
}
