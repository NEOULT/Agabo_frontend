import type { IProductRepository, ProductQueryParams } from '@/domain/repositories';
import type {
  Product,
  ProductCode,
  CreateProductDTO,
  UpdateProductDTO,
  CreateProductCodeDTO,
  UpdateProductCodeDTO,
} from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toProduct,
  toProductCode,
  type ApiProduct,
  type ApiProductCode,
  type ApiProductListResponse,
} from './product.mapper';

/**
 * Implementación REST del catálogo de productos contra el backend Express
 * (módulo `catalog`, ver `docs/schema-catalog/api-contract-product.md`).
 *
 * Cubre dos endpoints relacionados:
 * - `/products`        → producto (CRUD + ciclo de vida)
 * - `/product-codes`   → códigos SKU / barras (crear, editar, retirar)
 */
export class ApiProductRepository implements IProductRepository {
  // --- Productos -----------------------------------------------------------
  async getAll(params?: ProductQueryParams): Promise<{ data: Product[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.search) query.product_name_text = params.search;
      if (params?.categoryId) query.category_uuid = params.categoryId;
      if (params?.brandId) query.brand_uuid = params.brandId;
      if (params?.baseUnitId) query.base_unit_uuid = params.baseUnitId;
      if (params?.code) query.product_code_text = params.code;
      if (params?.isActive !== undefined) query.product_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiProductListResponse>('/products', { params: query });

      return { data: data.items.map(toProduct), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<Product | null> {
    try {
      const { data } = await api.get<ApiProductListResponse>('/products', {
        params: { product_uuid: id },
      });
      const item = data.items[0];
      return item ? toProduct(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreateProductDTO): Promise<Product> {
    try {
      const { data: created } = await api.post<ApiProduct>('/products', {
        product_name_text: data.name,
        base_unit_uuid: data.base_unit_id,
        product_description_text: data.description ?? null,
        category_uuid: data.category_id ?? null,
        brand_uuid: data.brand_id ?? null,
      });
      return toProduct(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    try {
      // base_unit_uuid y company_uuid se rechazan con 400; el resto es editable
      // y los opcionales se limpian con null.
      const payload: Record<string, string | null> = {};
      if (data.name !== undefined) payload.product_name_text = data.name;
      if (data.description !== undefined) payload.product_description_text = data.description;
      if (data.category_id !== undefined) payload.category_uuid = data.category_id;
      if (data.brand_id !== undefined) payload.brand_uuid = data.brand_id;

      const { data: updated } = await api.patch<ApiProduct>(`/products/${id}`, payload);
      return toProduct(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<Product> {
    try {
      const { data } = await api.post<ApiProduct>(`/products/${id}/activate`);
      return toProduct(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<Product> {
    try {
      const { data } = await api.post<ApiProduct>(`/products/${id}/deactivate`);
      return toProduct(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  // --- Códigos -------------------------------------------------------------
  async createCode(data: CreateProductCodeDTO): Promise<ProductCode> {
    try {
      const { data: created } = await api.post<ApiProductCode>('/product-codes', {
        product_uuid: data.product_id,
        product_code_text: data.code,
        product_code_type_text: data.type,
        product_code_is_primary_bl: data.is_primary ?? false,
      });
      return toProductCode(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async updateCode(id: string, data: UpdateProductCodeDTO): Promise<ProductCode> {
    try {
      // product_uuid no es editable en PATCH.
      const payload: Record<string, string | boolean> = {};
      if (data.code !== undefined) payload.product_code_text = data.code;
      if (data.type !== undefined) payload.product_code_type_text = data.type;
      if (data.is_primary !== undefined) payload.product_code_is_primary_bl = data.is_primary;

      const { data: updated } = await api.patch<ApiProductCode>(`/product-codes/${id}`, payload);
      return toProductCode(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async removeCode(id: string): Promise<void> {
    try {
      await api.delete(`/product-codes/${id}`);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
