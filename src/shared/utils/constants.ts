/** Unidades de medida disponibles para productos */
export const UNITS = [
  'unidad',
  'kilogramo',
  'gramo',
  'litro',
  'mililitro',
  'caja',
  'pack',
  'metro',
  'par',
  'docena',
] as const;

export type Unit = (typeof UNITS)[number];

/** Categorías de ejemplo */
export const DEFAULT_CATEGORIES = [
  'Lácteos',
  'Cárnicos',
  'Bebidas',
  'Aseo',
  'Limpieza',
  'Granos',
  'Enlatados',
  'Congelados',
  'Panadería',
  'Varios',
] as const;

/** Límites de paginación */
export const PAGE_LIMITS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_LIMIT = 20;

/** Umbral de stock bajo (porcentaje del stock mínimo) */
export const LOW_STOCK_THRESHOLD = 1.2; // 120% del mínimo = alerta
