import { BASE_CURRENCY_FORMAT, type CurrencyFormat } from '@/shared/config/currency';

/**
 * Formatea un número como moneda.
 *
 * Por defecto usa la moneda base (`$`). Recibe un formato opcional
 * (`{ symbol, fractionDigits }`) para pintar el importe ya convertido a la
 * moneda de visualización que venga del backend.
 */
export function formatCurrency(
  value: number,
  format: CurrencyFormat = BASE_CURRENCY_FORMAT,
): string {
  const { symbol, fractionDigits } = format;
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return `${symbol} ${formatted}`;
}

/** Formatea una cantidad de inventario (hasta 4 decimales). */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 }).format(value);
}

/** Formatea una fecha ISO a formato legible */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString));
}

/** Formatea una fecha ISO a formato corto (DD/MM/YYYY) */
export function formatDateShort(isoString: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoString));
}

/** Capitaliza la primera letra de un texto */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Trunca un texto a una longitud máxima */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}
