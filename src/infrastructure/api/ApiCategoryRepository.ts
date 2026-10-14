import type { ICategoryRepository, CategoryQueryParams } from '@/domain/repositories';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toCategory, type ApiCategory, type ApiCategoryListResponse } from './category.mapper';

/** Implementación REST de `catalog.category` (ver api-contract-classification.md §2). */
export class ApiCategoryRepository implements ICategoryRepository {
  async getAll(params?: CategoryQueryParams): Promise<{ data: Category[]; total: number }> {
    try {
      const query: Record<string, string> = {};
      if (params?.search) query.category_name_text = params.search;
      if (params?.parentId) query.parent_category_uuid = params.parentId;
      if (params?.isActive !== undefined) query.category_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiCategoryListResponse>('/categories', { params: query });

      return { data: data.items.map(toCategory), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Category | null> {
    try {
      const { data } = await api.get<ApiCategoryListResponse>('/categories', {
        params: { category_uuid: id },
      });
      const item = data.items[0];
      return item ? toCategory(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateCategoryDTO): Promise<Category> {
    try {
      const { data: created } = await api.post<ApiCategory>('/categories', {
        category_name_text: data.name,
        parent_category_uuid: data.parent_id ?? null,
      });
      return toCategory(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateCategoryDTO): Promise<Category> {
    try {
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.category_name_text = data.name;
      if (data.parent_id !== undefined) payload.parent_category_uuid = data.parent_id;

      const { data: updated } = await api.patch<ApiCategory>(`/categories/${id}`, payload);
      return toCategory(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Category> {
    try {
      const { data } = await api.post<ApiCategory>(`/categories/${id}/activate`);
      return toCategory(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Category> {
    try {
      const { data } = await api.post<ApiCategory>(`/categories/${id}/deactivate`);
      return toCategory(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
