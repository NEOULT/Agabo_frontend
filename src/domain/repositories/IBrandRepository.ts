import type { Brand, CreateBrandDTO, UpdateBrandDTO } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/** Filtros soportados por GET /api/brands. */
export interface BrandQueryParams extends SearchParams {
  /** Filtro por estado (brand_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato de marcas (catalog.brand).
 * No existe `delete`: se activan/desactivan (RF-CAT-008).
 */
export interface IBrandRepository {
  getAll(params?: BrandQueryParams): Promise<{ data: Brand[]; total: number }>;
  getById(id: string): Promise<Brand | null>;
  create(data: CreateBrandDTO): Promise<Brand>;
  update(id: string, data: UpdateBrandDTO): Promise<Brand>;
  setActive(id: string): Promise<Brand>;
  setInactive(id: string): Promise<Brand>;
}
