/**
 * Utilidades de la carga de productos.
 *
 * El alta de un producto recibe datos de varias fuentes (catálogo, compra e
 * inventario). Aquí viven las reglas que se repiten entre el alta individual y
 * la carga masiva: el SKU que se deriva de la marca, el nombre compuesto y la
 * descripción que guarda los datos de la compra.
 */

/** Longitud máxima del nombre del producto en el backend. */
export const PRODUCT_NAME_MAX_LENGTH = 200;

/** Longitud máxima de la descripción del producto en el backend. */
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Prefijo del SKU a partir de la marca: sus tres primeros caracteres
 * alfanuméricos en mayúscula. `Asfalto` → `ASF`, `HP` → `HP`,
 * sin marca → `GEN`.
 */
export function brandPrefix(brandName?: string): string {
  const cleaned = (brandName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  return cleaned.slice(0, 3) || 'GEN';
}

/**
 * Siguiente SKU del prefijo: `PREFIJO` + serial ascendente de dos dígitos
 * (`ASF01`, `ASF02`, …). Toma el mayor serial existente entre los códigos del
 * catálogo para no repetir.
 */
export function nextSku(prefix: string, existingCodes: string[]): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`, 'i');

  let max = 0;
  for (const code of existingCodes) {
    const match = pattern.exec(code.trim());
    if (!match) continue;
    const serial = Number(match[1]);
    if (Number.isFinite(serial)) max = Math.max(max, serial);
  }

  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

/** Texto de cantidad con su unidad: `1 unidad`, `10 unidades`. */
export function unitsLabel(quantity?: number): string {
  if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) return '';
  return `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`;
}

export interface ProductNameParts {
  brand?: string;
  category?: string;
  /** Nombre propio del producto, sin la marca ni la categoría. */
  name: string;
  /** Código con el que el proveedor identifica el producto. */
  supplierCode?: string;
  quantity?: number;
}

/**
 * Nombre final del producto:
 * `Marca - Categoría - Nombre - Código del proveedor - Cantidad de unidades`.
 *
 * Los tramos vacíos se omiten. El resultado se recorta al máximo del backend.
 */
export function buildProductName(parts: ProductNameParts): string {
  const pieces = [
    parts.brand,
    parts.category,
    parts.name,
    parts.supplierCode,
    unitsLabel(parts.quantity),
  ];

  return pieces
    .map((piece) => piece?.trim())
    .filter((piece): piece is string => Boolean(piece))
    .join(' - ');
}

export interface PurchaseDescriptionParts {
  /** Descripción libre que escribe la persona. */
  description?: string;
  supplierName?: string;
  supplierCode?: string;
  invoiceNumber?: string;
  pickingNumber?: string;
  unitPrice?: number;
  quantity?: number;
}

/**
 * Descripción del producto: la nota libre y, debajo, el resumen de la compra
 * (proveedor, factura, picking, precio y unidades). El backend no tiene
 * columnas para esos datos, así que se conservan aquí para poder consultarlos
 * desde el detalle.
 */
export function buildPurchaseDescription(parts: PurchaseDescriptionParts): string {
  const detail: string[] = [];

  if (parts.supplierName?.trim()) detail.push(`Proveedor: ${parts.supplierName.trim()}`);
  if (parts.supplierCode?.trim()) detail.push(`Código proveedor: ${parts.supplierCode.trim()}`);
  if (parts.invoiceNumber?.trim()) detail.push(`Factura: ${parts.invoiceNumber.trim()}`);
  if (parts.pickingNumber?.trim()) detail.push(`Picking: ${parts.pickingNumber.trim()}`);
  if (parts.unitPrice !== undefined && parts.unitPrice > 0) {
    detail.push(`Precio unitario: ${parts.unitPrice}`);
  }
  if (parts.quantity !== undefined && parts.quantity > 0) {
    detail.push(`Unidades: ${unitsLabel(parts.quantity)}`);
  }

  const purchaseLine = detail.length > 0 ? `Compra: ${detail.join(' · ')}` : '';

  return [parts.description?.trim(), purchaseLine]
    .filter((piece): piece is string => Boolean(piece))
    .join('\n\n')
    .slice(0, PRODUCT_DESCRIPTION_MAX_LENGTH);
}
