import type { ICurrencyRepository, CurrencyQueryParams } from '@/domain/repositories';
import type { Currency } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';
import { toCurrency, type ApiCurrencyListResponse } from './currency.mapper';

/** Implementación REST de `company.currency` (GET /api/currencies). */
export class ApiCurrencyRepository implements ICurrencyRepository {
  async getAll(params?: CurrencyQueryParams): Promise<{ data: Currency[]; total: number }> {
    try {
      // El backend rechaza query params vacíos con 400: solo filtros activos.
      const query: Record<string, string> = {};
      if (params?.search) query.currency_name_text = params.search;
      if (params?.isActive !== undefined) {
        query.currency_is_active_bl = String(params.isActive);
      }

      const { data } = await api.get<ApiCurrencyListResponse>('/currencies', { params: query });

      return { data: data.items.map(toCurrency), total: data.items.length };
    } catch (error) {
      throw toApiError(error);
    }
  }
}
