import type { PriceList } from '@/domain/models';

/** Contrato crudo de GET /api/price-lists del backend Express. */
export interface ApiPriceList {
  price_list_uuid: string;
  branch_uuid: string;
  price_list_name_text: string;
  price_list_is_active_bl: boolean;
  price_list_created_at_tsz: string;
  price_list_updated_at_tsz: string;
}

/** Respuesta de GET /api/price-lists (lista). */
export interface ApiPriceListListResponse {
  message: string;
  items: ApiPriceList[];
}

/** Convierte el modelo crudo del backend al modelo de dominio PriceList. */
export function toPriceList(apiPriceList: ApiPriceList): PriceList {
  return {
    id: apiPriceList.price_list_uuid,
    branch_id: apiPriceList.branch_uuid,
    name: apiPriceList.price_list_name_text,
    is_active: apiPriceList.price_list_is_active_bl,
    created_at: apiPriceList.price_list_created_at_tsz,
    updated_at: apiPriceList.price_list_updated_at_tsz,
  };
}
