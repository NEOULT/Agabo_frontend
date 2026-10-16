/**
 * 💱 Moneda (company.currency)
 *
 * Catálogo **global** del sistema: no pertenece a una empresa. Agabo maneja tres
 * monedas fijas (USD base, VES y EUR) y solo se activan/desactivan, así que desde
 * la interfaz es de solo lectura.
 */
export interface Currency {
  /** currency_uuid */
  id: string;
  /** currency_code_text — código ISO 4217 (USD, VES, EUR) */
  code: string;
  /** currency_name_text */
  name: string;
  /** currency_symbol_text */
  symbol: string;
  /** currency_decimals_int — decimales visibles */
  decimals: number;
  /** currency_exchange_rate_num — unidades de esta moneda por 1 unidad de la base */
  exchange_rate: number;
  /** currency_is_base_bl — es la moneda base del sistema */
  is_base: boolean;
  /** currency_sort_order_int — orden de presentación */
  sort_order: number;
  /** currency_is_active_bl */
  is_active: boolean;
  /** currency_created_at_tsz */
  created_at: string;
  /** currency_updated_at_tsz */
  updated_at: string;
}
