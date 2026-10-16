/**
 * Formato de moneda para presentación.
 *
 * Las monedas ya NO viven aquí: se cargan del backend (`company.currency`,
 * `GET /api/currencies`) con su símbolo, decimales y tasa. Este archivo solo
 * define el formato por defecto (moneda base) que usan las pantallas que no
 * eligen moneda.
 */
export interface CurrencyFormat {
  /** Símbolo con el que se pinta el importe. */
  symbol: string;
  /** Decimales visibles. */
  fractionDigits: number;
}

/** Formato por defecto: moneda base ($) con 2 decimales. */
export const BASE_CURRENCY_FORMAT: CurrencyFormat = { symbol: '$', fractionDigits: 2 };

/**
 * Convierte un importe en moneda base a otra moneda, dada su tasa (unidades de
 * esa moneda por 1 unidad de la base).
 */
export function convertFromBase(amountInBase: number, rate: number): number {
  return amountInBase * rate;
}
