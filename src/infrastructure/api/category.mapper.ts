import type { Category } from '@/domain/models';

/** Contrato crudo de GET/POST/PATCH /api/categories. */
export interface ApiCategory {
  category_uuid: string;
  company_uuid: string;
  parent_category_uuid: string | null;
  category_name_text: string;
  category_is_active_bl: boolean;
  category_created_at_tsz: string;
  category_updated_at_tsz: string;
}

export interface ApiCategoryListResponse {
  message: string;
  items: ApiCategory[];
}

export function toCategory(apiCategory: ApiCategory): Category {
  return {
    id: apiCategory.category_uuid,
    company_id: apiCategory.company_uuid,
    parent_id: apiCategory.parent_category_uuid ?? undefined,
    name: apiCategory.category_name_text,
    is_active: apiCategory.category_is_active_bl,
    created_at: apiCategory.category_created_at_tsz,
    updated_at: apiCategory.category_updated_at_tsz,
  };
}
