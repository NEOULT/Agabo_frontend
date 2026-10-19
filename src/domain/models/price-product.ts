/**
 * 💲 Precio de producto (catalog.price_product)
 *
 * Alineado al contrato (`docs/schema-catalog/api-contract-price.md`):
 * - Liga una lista de precios con un producto.
 * - Un precio vigente por lista y producto (RN-CAT-007); se retira con
 *   desactivación, no se elimina (RF-CAT-026).
 * - El valor se interpreta en la moneda de la empresa.
 */
export interface PriceProduct {
  /** price_product_uuid */
  id: string;
  /** price_list_uuid */
  price_list_id: string;
  /** product_uuid */
  product_id: string;
  /** price_product_price_num — >= 0 */
  price: number;
  /** price_product_is_active_bl */
  is_active: boolean;
  /** price_product_created_at_tsz */
  created_at: string;
  /** price_product_updated_at_tsz */
  updated_at: string;
}

/**
 * Asignación de precio (RF-CAT-023).
 *
 * La lista y el producto deben existir y estar activos, y pertenecer a la
 * empresa de la sucursal de la lista (RF-CAT-027). No puede existir un precio
 * vigente para la misma lista y producto (RN-CAT-007).
 */
export interface CreatePriceProductDTO {
  price_list_id: string;
  product_id: string;
  price: number;
}

/**
 * El backend solo acepta el valor en PATCH (RF-CAT-025); para cambiar de lista
 * o producto se retira el precio y se asigna uno nuevo.
 */
export interface UpdatePriceProductDTO {
  price?: number;
}
