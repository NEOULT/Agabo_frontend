/**
 * 📊 Agregaciones puras para métricas y reportes.
 *
 * Funciones sin React ni acceso a datos: reciben colecciones y devuelven
 * números o listas ordenadas. Así se reutilizan en cualquier pantalla y se
 * pueden probar aisladas.
 */

/** Punto de una serie (para gráficos de tendencia). */
export interface SeriesPoint {
  label: string;
  value: number;
}

/** Elemento de un ranking o desglose (para listas con barra). */
export interface RankedItem {
  label: string;
  value: number;
  /** Dato secundario opcional (ej: cantidad, "agotado"). */
  secondary?: string;
}

/** Suma de una lista de números (0 si está vacía). */
export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Promedio (0 si no hay valores). */
export function mean(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

/** Porcentaje de `part` sobre `total`, acotado a 0..100 (0 si total = 0). */
export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

/** Suma un valor numérico agrupando por clave. */
export function sumByKey<T>(
  items: T[],
  keyOf: (item: T) => string,
  valueOf: (item: T) => number,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    totals.set(key, (totals.get(key) ?? 0) + valueOf(item));
  }
  return totals;
}

/** Cuenta elementos por clave. */
export function countByKey<T>(items: T[], keyOf: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Convierte un mapa clave→valor en una lista ordenada descendente, con
 * etiqueta legible, límite opcional y dato secundario opcional.
 */
export function toRankedList(
  totals: Map<string, number>,
  labelOf: (key: string) => string,
  options: { limit?: number; secondaryOf?: (key: string) => string | undefined } = {},
): RankedItem[] {
  const list = [...totals.entries()]
    .map(([key, value]) => ({
      label: labelOf(key),
      value,
      secondary: options.secondaryOf?.(key),
    }))
    .sort((a, b) => b.value - a.value);

  return options.limit !== undefined ? list.slice(0, options.limit) : list;
}

/** Formatea una fecha a la clave local `YYYY-MM-DD` (misma zona del navegador). */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Serie diaria entre dos fechas, incluyendo los días sin datos (valor 0).
 *
 * Útil para la tendencia de ventas: se ve el hueco de un día flojo, no solo los
 * días con movimiento.
 */
export function buildDailySeries<T>(
  items: T[],
  dateOf: (item: T) => string,
  valueOf: (item: T) => number,
  from: string,
  to: string,
): SeriesPoint[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = dayKey(new Date(dateOf(item)));
    totals.set(key, (totals.get(key) ?? 0) + valueOf(item));
  }

  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  const series: SeriesPoint[] = [];
  const cursor = new Date(start);
  // Tope de seguridad por si el rango viniera abierto.
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const key = dayKey(cursor);
    series.push({ label: String(cursor.getDate()), value: totals.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }

  return series;
}
