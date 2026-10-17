import type { ParkedSaleLine } from '@/application/stores/useParkedSalesStore';
import type { CreateSaleDetailDTO, Product, ProductUnit } from '@/domain/models';
import type { CartLine, PosStockLevel, PosStockLevels } from './pos.types';

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

/** Cantidad de existencias legible (14, 1,5, 0,25...). */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 4 }).format(value);
}

/** Redondeo a 4 decimales: la escala de las cantidades en el backend. */
export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/** Unidades base de una línea (cantidad × factor de la presentación). */
export function baseQuantity(line: { quantity: number; unit_factor: number }): number {
  const factor = line.unit_factor > 0 ? line.unit_factor : 1;
  return roundQuantity(line.quantity * factor);
}

/**
 * Existencia expresada en la presentación indicada. Con una presentación mayor
 * (factor > 1) no se muestran fracciones: 14 unidades base son 1 "Caja x 12".
 */
export function availableInUnits(availableInBase: number, factor: number): number {
  return factor > 1 ? Math.floor(availableInBase / factor) : availableInBase;
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

/**
 * Reparte una línea del carrito entre las ubicaciones del almacén de origen.
 *
 * La venta descuenta la existencia de la ubicación que indica la línea
 * (`stock.decrement` compara `location_uuid`), así que una línea sin ubicación
 * no encuentra la mercancía guardada en un estante. Se toma primero de la
 * ubicación con más existencia y, si hace falta, se parte en varias líneas del
 * mismo producto: el backend descuenta cada una de su ubicación.
 *
 * La existencia está en unidades base y la línea en su presentación, así que el
 * reparto se hace en unidades base y cada trozo vuelve a la presentación (media
 * caja es una línea válida si la ubicación solo tiene media caja).
 */
function allocateLine(
  line: CartLine,
  level: PosStockLevel | undefined,
): CreateSaleDetailDTO[] {
  const base = {
    product_id: line.product_id,
    product_unit_id: line.product_unit_id,
    unit_price: line.unit_price,
  };
  const factor = line.unit_factor > 0 ? line.unit_factor : 1;

  // Sin dato de existencias (sin permiso de inventario o consulta fallida) se
  // envía la línea sin ubicación y el backend sigue validando la existencia.
  if (!level || level.locations.length === 0) {
    return [{ ...base, quantity: line.quantity }];
  }

  const byQuantity = [...level.locations].sort((a, b) => b.quantity - a.quantity);
  const details: CreateSaleDetailDTO[] = [];
  let remaining = baseQuantity(line);

  for (const location of byQuantity) {
    if (remaining <= 0) break;

    const take = Math.min(location.quantity, remaining);
    details.push({
      ...base,
      location_id: location.location_id,
      quantity: roundQuantity(take / factor),
    });
    remaining = roundQuantity(remaining - take);
  }

  // No alcanza: el resto viaja igual para que el backend rechace la venta con
  // `insufficient_stock` (la confirmación ya lo advierte antes de cobrar).
  if (remaining > 0) {
    details.push({
      ...base,
      location_id: byQuantity[0].location_id,
      quantity: roundQuantity(remaining / factor),
    });
  }

  return details;
}

/**
 * Detalle que viaja al backend al registrar la venta (RN-SAL-009), imputado a
 * las ubicaciones del almacén de origen y en la presentación vendida (el
 * backend lo pasa a unidades base con el factor).
 */
export function toSaleDetails(
  lines: CartLine[],
  stock?: PosStockLevels | null,
): CreateSaleDetailDTO[] {
  if (!stock) {
    return lines.map((line) => ({
      product_id: line.product_id,
      product_unit_id: line.product_unit_id,
      quantity: line.quantity,
      unit_price: line.unit_price,
    }));
  }

  return lines.flatMap((line) => allocateLine(line, stock[line.product_id]));
}

/** Líneas que se guardan en un ticket en espera (sin la clave de React). */
export function toParkedLines(lines: CartLine[]): ParkedSaleLine[] {
  return lines.map((line) => ({
    product_id: line.product_id,
    product_unit_id: line.product_unit_id,
    product_name: line.product_name,
    unit_name: line.unit_name,
    unit_factor: line.unit_factor,
    quantity: line.quantity,
    unit_price: line.unit_price,
    is_hidden: line.is_hidden,
  }));
}

/**
 * Vuelve a armar el carrito desde un ticket en espera, con claves nuevas. Los
 * tickets guardados antes de conocer el factor se leen como presentación base.
 */
export function fromParkedLines(lines: ParkedSaleLine[]): CartLine[] {
  return lines.map((line) => ({
    ...line,
    unit_factor: line.unit_factor > 0 ? line.unit_factor : 1,
    key: nextCartLineKey(),
  }));
}
