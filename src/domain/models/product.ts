/**
 * 📦 Producto (catalog.product)
 *
 * Alineado al contrato (`docs/schema-catalog/api-contract-product.md`):
 * - `base_unit_id` es obligatorio al crear y NO es editable después.
 * - Al crear, el backend genera automáticamente la **presentación base**
 *   (un `product_unit` sobre la unidad base, factor 1).
 * - Los precios NO viven aquí: están en `catalog.price_product` por lista
 *   de precios (módulo de precios, pendiente).
 * - No se elimina: se activa/desactiva (RF-CAT-016).
 */

/** Tipo de código de producto (catalog.product_code). */
export type ProductCodeType = 'sku' | 'barcode';

/** 📇 Código de producto (SKU o código de barras). */
export interface ProductCode {
  /** product_code_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** product_uuid */
  product_id: string;
  /** product_code_text */
  code: string;
  /** product_code_type_text */
  type: ProductCodeType;
  /** product_code_is_primary_bl */
  is_primary: boolean;
  /** product_code_created_at_tsz */
  created_at: string;
  /** product_code_updated_at_tsz */
  updated_at: string;
}

/**
 * 📦 Presentación del producto (catalog.product_unit).
 * Ej: "Caja x 12" sobre la unidad "Caja" con factor 12.
 */
export interface ProductUnit {
  /** product_unit_uuid */
  id: string;
  /** product_uuid */
  product_id: string;
  /** unit_uuid */
  unit_id: string;
  /** product_unit_name_text */
  name: string;
  /** product_unit_factor_num — unidades base que contiene; > 0 */
  factor: number;
  /** product_unit_is_active_bl */
  is_active: boolean;
  /** product_unit_created_at_tsz */
  created_at: string;
  /** product_unit_updated_at_tsz */
  updated_at: string;
}

export interface Product {
  /** product_uuid */
  id: string;
  /** company_uuid */
  company_id: string;
  /** category_uuid */
  category_id?: string;
  /** brand_uuid */
  brand_id?: string;
  /** base_unit_uuid — inmutable después de crear */
  base_unit_id: string;
  /** product_name_text */
  name: string;
  /** product_description_text */
  description?: string;
  /** product_is_active_bl */
  is_active: boolean;
  /** product_created_at_tsz */
  created_at: string;
  /** product_updated_at_tsz */
  updated_at: string;
  /** Códigos (SKU / barras) del producto. */
  codes: ProductCode[];
  /** Presentaciones del producto (incluye la base). */
  units: ProductUnit[];
}

export interface CreateProductDTO {
  name: string;
  base_unit_id: string;
  description?: string;
  category_id?: string;
  brand_id?: string;
}

/**
 * El backend solo acepta name, description, category_id y brand_id en PATCH.
 * `base_unit_id` no es editable.
 */
export interface UpdateProductDTO {
  name?: string;
  description?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
}

export interface CreateProductCodeDTO {
  product_id: string;
  code: string;
  type: ProductCodeType;
  is_primary?: boolean;
}

/** `product_id` no es editable en PATCH. */
export interface UpdateProductCodeDTO {
  code?: string;
  type?: ProductCodeType;
  is_primary?: boolean;
}

export interface CreatePresentationDTO {
  product_id: string;
  unit_id: string;
  name: string;
  factor: number;
}

/** `product_id` y `unit_id` no son editables en PATCH. */
export interface UpdatePresentationDTO {
  name?: string;
  factor?: number;
}
