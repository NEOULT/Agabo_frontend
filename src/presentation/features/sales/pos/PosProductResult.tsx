import { Barcode, Plus } from 'lucide-react';
import type { Product } from '@/domain/models';
import {
  avatarClass,
  availableInUnits,
  defaultUnit,
  formatQuantity,
} from '@/application/hooks/pos/pos.utils';

interface PosProductResultProps {
  product: Product;
  /** Precio de catálogo de la presentación por defecto, en moneda base. */
  getPrice: (productId: string, productUnitId: string) => number | undefined;
  /** Pinta un importe en la moneda de visualización del POS. */
  formatAmount: (valueInBase: number) => string;
  /**
   * Existencia del producto en el almacén de origen, en unidades base
   * (`undefined` = todavía sin dato, por ejemplo sin permiso de inventario).
   */
  available?: number;
  onSelect: (product: Product) => void;
}

/** Resultado de la búsqueda: un producto listo para agregar al carrito. */
export function PosProductResult({
  product,
  getPrice,
  formatAmount,
  available,
  onSelect,
}: PosProductResultProps) {
  const unit = defaultUnit(product);
  const price = unit ? getPrice(product.id, unit.id) : undefined;
  const hasStock = available !== undefined && available > 0;
  const factor = unit?.factor ?? 1;
  // La existencia está en unidades base; en una presentación mayor se muestra
  // cuántas caben y cuántas unidades base quedan.
  const stockLabel =
    available === undefined
      ? null
      : !hasStock
        ? 'Sin stock'
        : factor > 1
          ? `${formatQuantity(availableInUnits(available, factor))} ${unit?.name} · ${formatQuantity(available)} u. base`
          : `${formatQuantity(available)} disponibles`;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors border-b border-border-subtle last:border-b-0"
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${avatarClass(
          product.name,
        )}`}
      >
        {product.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text-primary">{product.name}</span>
        <span className="mt-0.5 flex items-center gap-2">
          {product.codes[0] && (
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              <Barcode className="h-3 w-3" />
              {product.codes[0].code}
            </span>
          )}
          {unit && <span className="text-xs text-text-tertiary">· {unit.name}</span>}
          {stockLabel && (
            <span
              title={
                available === undefined
                  ? undefined
                  : `${formatQuantity(available)} unidades base en el almacén de origen`
              }
              className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                hasStock
                  ? 'bg-semantic-success-50 text-semantic-success-700'
                  : 'bg-semantic-danger-50 text-semantic-danger-700'
              }`}
            >
              {stockLabel}
            </span>
          )}
        </span>
      </span>
      <span className="text-sm font-semibold text-text-primary">
        {price !== undefined ? formatAmount(price) : 'Sin precio'}
      </span>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Plus className="h-4 w-4" />
      </span>
    </button>
  );
}
