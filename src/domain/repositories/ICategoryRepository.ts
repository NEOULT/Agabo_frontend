import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/** Filtros soportados por GET /api/categories. */
export interface CategoryQueryParams extends SearchParams {
  /** Filtro exacto por categoría padre (parent_category_uuid). */
  parentId?: string;
  /** Filtro por estado (category_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de categorías (catalog.category).
 * No existe `delete`: se activan/desactivan (RF-CAT-004).
 */
export interface ICategoryRepository {
  getAll(params?: CategoryQueryParams): Promise<{ data: Category[]; total: number }>;
  getById(id: string): Promise<Category | null>;
  create(data: CreateCategoryDTO): Promise<Category>;
  update(id: string, data: UpdateCategoryDTO): Promise<Category>;
  setActive(id: string): Promise<Category>;
  setInactive(id: string): Promise<Category>;
}
