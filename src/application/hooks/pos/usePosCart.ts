import { useCallback, useMemo } from 'react';
import type { ParkedSaleLine } from '@/application/stores/useParkedSalesStore';
import { usePosSessionStore } from '@/application/stores/usePosSessionStore';
import type { Product } from '@/domain/models';
import {
  billableLines,
  cartItemsCount,
  cartTotal,
  fromParkedLines,
  nextCartLineKey,
} from './pos.utils';

interface UsePosCartOptions {
  /** Precio de catálogo de la sucursal para el producto. */
  getPrice: (productId: string) => number | undefined;
}

/**
 * Carrito del punto de venta.
 *
 * Las líneas no viven en el componente sino en `usePosSessionStore`, que se
 * persiste en el navegador: salir de la pantalla o recargar no pierde la venta
 * en curso. Este hook solo aporta lo que el store no puede saber por sí solo —
 * el precio de catálogo de la sucursal— y los totales derivados.
 *
 * Cada línea oculta con el "ojito" sigue en el carrito pero no cuenta para el
 * total ni se cobra.
 */
export function usePosCart({ getPrice }: UsePosCartOptions) {
  const lines = usePosSessionStore((state) => state.lines);
  const upsertLine = usePosSessionStore((state) => state.upsertLine);
  const updateLine = usePosSessionStore((state) => state.updateLine);
  const removeLine = usePosSessionStore((state) => state.removeLine);
  const toggleLineHidden = usePosSessionStore((state) => state.toggleLineHidden);
  const replaceLines = usePosSessionStore((state) => state.replaceLines);
  const clearLines = usePosSessionStore((state) => state.clearLines);

  const billable = useMemo(() => billableLines(lines), [lines]);
  const total = useMemo(() => cartTotal(billable), [billable]);
  // Las unidades que se muestran son las que se cobran: las ocultas no cuentan.
  const itemsCount = useMemo(() => cartItemsCount(billable), [billable]);

  /**
   * Agrega un producto con el precio de catálogo. Dos líneas del mismo producto
   * se suman. `unitName` es el nombre de la unidad base, solo para mostrar.
   */
  const addProduct = useCallback(
    (product: Product, unitName = 'Unidad') => {
      upsertLine({
        key: nextCartLineKey(),
        product_id: product.id,
        product_name: product.name,
        unit_name: unitName,
        quantity: 1,
        unit_price: getPrice(product.id) ?? 0,
        is_hidden: false,
      });
    },
    [getPrice, upsertLine],
  );

  const clear = useCallback(() => clearLines(), [clearLines]);

  /** Retoma un ticket en espera: el carrito vuelve con claves nuevas. */
  const restore = useCallback(
    (parkedLines: ParkedSaleLine[]) => replaceLines(fromParkedLines(parkedLines)),
    [replaceLines],
  );

  return {
    lines,
    billable,
    total,
    itemsCount,
    addProduct,
    updateLine,
    removeLine,
    toggleLineHidden,
    clear,
    restore,
  };
}
