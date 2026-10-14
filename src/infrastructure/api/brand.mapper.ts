import type { Brand } from '@/domain/models';

/** Contrato crudo de GET/POST/PATCH /api/brands. */
export interface ApiBrand {
  brand_uuid: string;
  company_uuid: string;
  brand_name_text: string;
  brand_is_active_bl: boolean;
  brand_created_at_tsz: string;
  brand_updated_at_tsz: string;
}

export interface ApiBrandListResponse {
  message: string;
  items: ApiBrand[];
}

export function toBrand(apiBrand: ApiBrand): Brand {
  return {
    id: apiBrand.brand_uuid,
    company_id: apiBrand.company_uuid,
    name: apiBrand.brand_name_text,
    is_active: apiBrand.brand_is_active_bl,
    created_at: apiBrand.brand_created_at_tsz,
    updated_at: apiBrand.brand_updated_at_tsz,
  };
}
