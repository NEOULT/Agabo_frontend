import type { Currency } from '@/domain/models';

/** Contrato crudo de GET /api/currencies. */
export interface ApiCurrency {
  currency_uuid: string;
  currency_code_text: string;
  currency_name_text: string;
  currency_symbol_text: string;
  currency_decimals_int: number;
  currency_exchange_rate_num: number;
  currency_is_base_bl: boolean;
  currency_sort_order_int: number;
  currency_is_active_bl: boolean;
  currency_created_at_tsz: string;
  currency_updated_at_tsz: string;
}

export interface ApiCurrencyListResponse {
  message: string;
  items: ApiCurrency[];
}

export function toCurrency(apiCurrency: ApiCurrency): Currency {
  return {
    id: apiCurrency.currency_uuid,
    code: apiCurrency.currency_code_text,
    name: apiCurrency.currency_name_text,
    symbol: apiCurrency.currency_symbol_text,
    decimals: apiCurrency.currency_decimals_int,
    exchange_rate: apiCurrency.currency_exchange_rate_num,
    is_base: apiCurrency.currency_is_base_bl,
    sort_order: apiCurrency.currency_sort_order_int,
    is_active: apiCurrency.currency_is_active_bl,
    created_at: apiCurrency.currency_created_at_tsz,
    updated_at: apiCurrency.currency_updated_at_tsz,
  };
}
