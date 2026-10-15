/**
 * 🏷️ Lista de precios (catalog.price_list)
 *
 * Alineada al contrato (`docs/schema-catalog/api-contract-price.md`):
 * - Pertenece a una sucursal y la empresa sale de `company.branch`.
 * - No se elimina: se activa/desactiva (RF-CAT-022).
 */
export interface PriceList {
  /** price_list_uuid */
  id: string;
  /** branch_uuid — sucursal propietaria de la lista */
  branch_id: string;
  /** price_list_name_text */
  name: string;
  /** price_list_is_active_bl */
  is_active: boolean;
  /** price_list_created_at_tsz */
  created_at: string;
  /** price_list_updated_at_tsz */
  updated_at: string;
}

/**
 * Alta de lista de precios (RF-CAT-019).
 *
 * La sucursal debe existir, estar activa y pertenecer a la empresa del token
 * (RF-CAT-027 y RF-CAT-029). La lista nueva queda activa.
 */
export interface CreatePriceListDTO {
  branch_id: string;
  name: string;
}

/** El backend solo acepta `name` en PATCH; `branch_id` no es editable (RF-CAT-021). */
export interface UpdatePriceListDTO {
  name?: string;
}
