import type {
  IPriceProductRepository,
  PriceProductQueryParams,
} from '@/domain/repositories';
import type {
  PriceProduct,
  CreatePriceProductDTO,
  UpdatePriceProductDTO,
} from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toPriceProduct,
  type ApiPriceProduct,
  type ApiPriceProductListResponse,
} from './price-product.mapper';

/**
 * Implementación REST de `catalog.price_product` contra el backend Express
 * (ver `docs/schema-catalog/api-contract-price.md`).
 *
 * Liga una lista con una presentación de un producto y no se elimina: el
 * precio se retira con desactivación (RF-CAT-026).
 */
export class ApiPriceProductRepository implements IPriceProductRepository {
  async getAll(
    params?: PriceProductQueryParams,
  ): Promise<{ data: PriceProduct[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.priceListId) query.price_list_uuid = params.priceListId;
      if (params?.productId) query.product_uuid = params.productId;
      if (params?.productUnitId) query.product_unit_uuid = params.productUnitId;
      if (params?.isActive !== undefined) {
        query.price_product_is_active_bl = String(params.isActive);
      }

      const { data } = await api.get<ApiPriceProductListResponse>('/price-products', {
        params: query,
      });

      return { data: data.items.map(toPriceProduct), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<PriceProduct | null> {
    try {
      const { data } = await api.get<ApiPriceProductListResponse>('/price-products', {
        params: { price_product_uuid: id },
      });
      const item = data.items[0];
      return item ? toPriceProduct(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreatePriceProductDTO): Promise<PriceProduct> {
    try {
      const { data: created } = await api.post<ApiPriceProduct>('/price-products', {
        price_list_uuid: data.price_list_id,
        product_uuid: data.product_id,
        product_unit_uuid: data.product_unit_id,
        price_product_price_num: data.price,
      });
      return toPriceProduct(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdatePriceProductDTO): Promise<PriceProduct> {
    try {
      // La lista, el producto y la presentación no son editables en PATCH
      // (RF-CAT-025): para cambiarlos se retira el precio y se asigna otro.
      const payload: Record<string, number> = {};
      if (data.price !== undefined) payload.price_product_price_num = data.price;

      const { data: updated } = await api.patch<ApiPriceProduct>(`/price-products/${id}`, payload);
      return toPriceProduct(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<PriceProduct> {
    try {
      const { data } = await api.post<ApiPriceProduct>(`/price-products/${id}/activate`);
      return toPriceProduct(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<PriceProduct> {
    try {
      const { data } = await api.post<ApiPriceProduct>(`/price-products/${id}/deactivate`);
      return toPriceProduct(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
