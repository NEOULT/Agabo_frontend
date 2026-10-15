import type { IPriceListRepository, PriceListQueryParams } from '@/domain/repositories';
import type {
  PriceList,
  CreatePriceListDTO,
  UpdatePriceListDTO,
} from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import {
  toPriceList,
  type ApiPriceList,
  type ApiPriceListListResponse,
} from './price-list.mapper';

/**
 * Implementación REST de `catalog.price_list` contra el backend Express
 * (ver `docs/schema-catalog/api-contract-price.md`).
 *
 * La lista pertenece a una sucursal y no se elimina: se activa/desactiva
 * (RF-CAT-022). El backend rechaza query params vacíos con 400, así que solo
 * se envían los filtros informados.
 */
export class ApiPriceListRepository implements IPriceListRepository {
  async getAll(params?: PriceListQueryParams): Promise<{ data: PriceList[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.search) query.price_list_name_text = params.search;
      if (params?.branchId) query.branch_uuid = params.branchId;
      if (params?.isActive !== undefined) query.price_list_is_active_bl = String(params.isActive);

      const { data } = await api.get<ApiPriceListListResponse>('/price-lists', { params: query });

      return { data: data.items.map(toPriceList), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getById(id: string): Promise<PriceList | null> {
    try {
      const { data } = await api.get<ApiPriceListListResponse>('/price-lists', {
        params: { price_list_uuid: id },
      });
      const item = data.items[0];
      return item ? toPriceList(item) : null;
    } catch (error) {
      throw toApiError(error);
    }
  }

  async create(data: CreatePriceListDTO): Promise<PriceList> {
    try {
      const { data: created } = await api.post<ApiPriceList>('/price-lists', {
        branch_uuid: data.branch_id,
        price_list_name_text: data.name,
      });
      return toPriceList(created);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async update(id: string, data: UpdatePriceListDTO): Promise<PriceList> {
    try {
      // branch_uuid no es editable en PATCH (RF-CAT-021).
      const payload: Record<string, string> = {};
      if (data.name !== undefined) payload.price_list_name_text = data.name;

      const { data: updated } = await api.patch<ApiPriceList>(`/price-lists/${id}`, payload);
      return toPriceList(updated);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setActive(id: string): Promise<PriceList> {
    try {
      const { data } = await api.post<ApiPriceList>(`/price-lists/${id}/activate`);
      return toPriceList(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async setInactive(id: string): Promise<PriceList> {
    try {
      const { data } = await api.post<ApiPriceList>(`/price-lists/${id}/deactivate`);
      return toPriceList(data);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
