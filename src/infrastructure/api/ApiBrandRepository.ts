import type { IBrandRepository, BrandQueryParams } from '@/domain/repositories';
import type { Brand, CreateBrandDTO, UpdateBrandDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toBrand, type ApiBrand, type ApiBrandListResponse } from './brand.mapper';

/** Implementación REST de `catalog.brand` (ver api-contract-classification.md §3). */
export class ApiBrandRepository implements IBrandRepository {
  async getAll(params?: BrandQueryParams): Promise<{ data: Brand[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.search) query.brand_name_text = params.search;
      if (params?.isActive !== undefined) query.brand_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiBrandListResponse>('/brands', { params: query });

      return { data: data.items.map(toBrand), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Brand | null> {
    try {
      const { data } = await api.get<ApiBrandListResponse>('/brands', {
        params: { brand_uuid: id },
      });
      const item = data.items[0];
      return item ? toBrand(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateBrandDTO): Promise<Brand> {
    try {
      const { data: created } = await api.post<ApiBrand>('/brands', {
        brand_name_text: data.name,
      });
      return toBrand(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateBrandDTO): Promise<Brand> {
    try {
      const payload: Record<string, string> = {};
      if (data.name !== undefined) payload.brand_name_text = data.name;

      const { data: updated } = await api.patch<ApiBrand>(`/brands/${id}`, payload);
      return toBrand(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Brand> {
    try {
      const { data } = await api.post<ApiBrand>(`/brands/${id}/activate`);
      return toBrand(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Brand> {
    try {
      const { data } = await api.post<ApiBrand>(`/brands/${id}/deactivate`);
      return toBrand(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
