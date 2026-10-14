import type { Product, ProductCode, ProductUnit, ProductCodeType } from '@/domain/models';

/** Contrato crudo de `catalog.product_code`. */
export interface ApiProductCode {
  product_code_uuid: string;
  company_uuid: string;
  product_uuid: string;
  product_code_text: string;
  product_code_type_text: string;
  product_code_is_primary_bl: boolean;
  product_code_created_at_tsz: string;
  product_code_updated_at_tsz: string;
}

/** Contrato crudo de `catalog.product_unit` (presentación). */
export interface ApiProductUnit {
  product_unit_uuid: string;
  product_uuid: string;
  unit_uuid: string;
  product_unit_name_text: string;
  product_unit_factor_num: number;
  product_unit_is_active_bl: boolean;
  product_unit_created_at_tsz: string;
  product_unit_updated_at_tsz: string;
}

/**
 * Contrato crudo de GET/POST/PATCH /api/products.
 * La respuesta incluye los códigos y las presentaciones embebidos.
 */
export interface ApiProduct {
  product_uuid: string;
  company_uuid: string;
  category_uuid: string | null;
  brand_uuid: string | null;
  base_unit_uuid: string;
  product_name_text: string;
  product_description_text: string | null;
  product_is_active_bl: boolean;
  product_created_at_tsz: string;
  product_updated_at_tsz: string;
  codes: ApiProductCode[];
  units: ApiProductUnit[];
}

export interface ApiProductListResponse {
  message: string;
  items: ApiProduct[];
}

/** El backend solo produce 'sku' o 'barcode'; se normaliza por seguridad. */
function toCodeType(value: string): ProductCodeType {
  return value === 'barcode' ? 'barcode' : 'sku';
}

export function toProductCode(apiCode: ApiProductCode): ProductCode {
  return {
    id: apiCode.product_code_uuid,
    company_id: apiCode.company_uuid,
    product_id: apiCode.product_uuid,
    code: apiCode.product_code_text,
    type: toCodeType(apiCode.product_code_type_text),
    is_primary: apiCode.product_code_is_primary_bl,
    created_at: apiCode.product_code_created_at_tsz,
    updated_at: apiCode.product_code_updated_at_tsz,
  };
}

export function toProductUnit(apiUnit: ApiProductUnit): ProductUnit {
  return {
    id: apiUnit.product_unit_uuid,
    product_id: apiUnit.product_uuid,
    unit_id: apiUnit.unit_uuid,
    name: apiUnit.product_unit_name_text,
    factor: apiUnit.product_unit_factor_num,
    is_active: apiUnit.product_unit_is_active_bl,
    created_at: apiUnit.product_unit_created_at_tsz,
    updated_at: apiUnit.product_unit_updated_at_tsz,
  };
}

export function toProduct(apiProduct: ApiProduct): Product {
  return {
    id: apiProduct.product_uuid,
    company_id: apiProduct.company_uuid,
    category_id: apiProduct.category_uuid ?? undefined,
    brand_id: apiProduct.brand_uuid ?? undefined,
    base_unit_id: apiProduct.base_unit_uuid,
    name: apiProduct.product_name_text,
    description: apiProduct.product_description_text ?? undefined,
    is_active: apiProduct.product_is_active_bl,
    created_at: apiProduct.product_created_at_tsz,
    updated_at: apiProduct.product_updated_at_tsz,
    codes: (apiProduct.codes ?? []).map(toProductCode),
    units: (apiProduct.units ?? []).map(toProductUnit),
  };
}
