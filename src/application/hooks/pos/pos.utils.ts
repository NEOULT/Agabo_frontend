import type { ParkedSaleLine } from '@/application/stores/useParkedSalesStore';
import type { CreateSaleDetailDTO, Product, ProductUnit } from '@/domain/models';
import type { CartLine } from './pos.types';

/**
 * Utilidades puras del punto de venta.
 *
 * No dependen de React ni del backend: reciben datos y devuelven datos. Así el
 * carrito, la búsqueda y las conversiones a payload se pueden probar sin montar
 * la pantalla.
 */

/** Paleta para el avatar del producto (variedad sin depender de imágenes). */
const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-semantic-success-100 text-semantic-success-700',
  'bg-semantic-warning-100 text-semantic-warning-700',
  'bg-semantic-danger-100 text-semantic-danger-700',
];

/** Color estable del avatar: el mismo producto siempre se ve igual. */
export function avatarClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

/** Clave de agrupación producto + presentación: dos líneas iguales se suman. */
export function cartLineKey(productId: string, productUnitId: string): string {
  return `${productId}:${productUnitId}`;
}

let lineCounter = 0;
/** Clave local de una línea nueva (solo para React). */
export function nextCartLineKey(): string {
  lineCounter += 1;
  return `cart-${Date.now()}-${lineCounter}`;
}

let parkedCounter = 0;
/** Identificador de un ticket en espera nuevo. */
export function nextParkedTicketId(): string {
  parkedCounter += 1;
  return `parked-${Date.now()}-${parkedCounter}`;
}

/** Presentación por defecto: la base si está activa, si no la primera activa. */
export function defaultUnit(product: Product): ProductUnit | undefined {
  return (
    product.units.find((unit) => unit.is_active && unit.id === product.base_unit_id) ??
    product.units.find((unit) => unit.is_active)
  );
}

/** Presentaciones activas listas para el selector de una línea del carrito. */
export function activeUnitOptions(product: Product | undefined): { value: string; label: string }[] {
  return (product?.units ?? [])
    .filter((unit) => unit.is_active)
    .map((unit) => ({ value: unit.id, label: `${unit.name} (×${unit.factor})` }));
}

/** ¿El producto coincide con el término por nombre o por código? */
export function matchesSearch(product: Product, normalizedTerm: string): boolean {
  return (
    product.name.toLowerCase().includes(normalizedTerm) ||
    product.codes.some((code) => code.code.toLowerCase().includes(normalizedTerm))
  );
}

/** Primeros resultados de la búsqueda (vacío si no hay término). */
export function searchProducts(products: Product[], search: string, limit = 8): Product[] {
  const term = search.trim().toLowerCase();
  if (!term) return [];
  return products.filter((product) => matchesSearch(product, term)).slice(0, limit);
}

/** Producto cuyo código coincide exactamente (lector de códigos de barras). */
export function findByExactCode(products: Product[], code: string): Product | undefined {
  const term = code.trim().toLowerCase();
  return products.find((product) => product.codes.some((c) => c.code.toLowerCase() === term));
}

/** Líneas que se cobran: las ocultas quedan fuera del total (RF-SAL-013). */
export function billableLines(lines: CartLine[]): CartLine[] {
  return lines.filter((line) => !line.is_hidden);
}

/** Total del carrito en moneda base. */
export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
}

/** Unidades del carrito: lo que se muestra en el pie ("N unidad(es)"). */
export function cartItemsCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Detalle que viaja al backend al registrar la venta (RN-SAL-009). */
export function toSaleDetails(lines: CartLine[]): CreateSaleDetailDTO[] {
  return lines.map((line) => ({
    product_id: line.product_id,
    product_unit_id: line.product_unit_id,
    quantity: line.quantity,
    unit_price: line.unit_price,
  }));
}

/** Líneas que se guardan en un ticket en espera (sin la clave de React). */
export function toParkedLines(lines: CartLine[]): ParkedSaleLine[] {
  return lines.map((line) => ({
    product_id: line.product_id,
    product_unit_id: line.product_unit_id,
    product_name: line.product_name,
    unit_name: line.unit_name,
    quantity: line.quantity,
    unit_price: line.unit_price,
    is_hidden: line.is_hidden,
  }));
}

/** Vuelve a armar el carrito desde un ticket en espera, con claves nuevas. */
export function fromParkedLines(lines: ParkedSaleLine[]): CartLine[] {
  return lines.map((line) => ({ ...line, key: nextCartLineKey() }));
}
