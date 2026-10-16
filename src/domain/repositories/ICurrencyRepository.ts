import type { Currency } from '@/domain/models';
import type { SearchParams } from '@/shared/types/common';

/** Filtros soportados por GET /api/currencies. */
export interface CurrencyQueryParams extends SearchParams {
  /** Filtro por estado (currency_is_active_bl). */
  isActive?: boolean;
}

/**
 * Contrato del catálogo de monedas (company.currency).
 *
 * Es de solo lectura: las monedas son fijas del sistema (USD, VES, EUR), no se
 * crean ni se editan desde la API.
 */
export interface ICurrencyRepository {
  getAll(params?: CurrencyQueryParams): Promise<{ data: Currency[]; total: number }>;
}
