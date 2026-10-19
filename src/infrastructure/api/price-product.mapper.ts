import type { PriceProduct } from '@/domain/models';

/** Contrato crudo de GET /api/price-products del backend Express. */
export interface ApiPriceProduct {
  price_product_uuid: string;
  price_list_uuid: string;
  product_uuid: string;
  price_product_price_num: number;
  price_product_is_active_bl: boolean;
  price_product_created_at_tsz: string;
  price_product_updated_at_tsz: string;
}

/** Respuesta de GET /api/price-products (lista). */
export interface ApiPriceProductListResponse {
  message: string;
  items: ApiPriceProduct[];
}

/** Convierte el modelo crudo del backend al modelo de dominio PriceProduct. */
export function toPriceProduct(apiPriceProduct: ApiPriceProduct): PriceProduct {
  return {
    id: apiPriceProduct.price_product_uuid,
    price_list_id: apiPriceProduct.price_list_uuid,
    product_id: apiPriceProduct.product_uuid,
    price: apiPriceProduct.price_product_price_num,
    is_active: apiPriceProduct.price_product_is_active_bl,
    created_at: apiPriceProduct.price_product_created_at_tsz,
    updated_at: apiPriceProduct.price_product_updated_at_tsz,
  };
}
