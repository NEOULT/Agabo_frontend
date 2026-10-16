import { useCallback, useMemo, useState } from 'react';
import type { ParkedSaleLine } from '@/application/stores/useParkedSalesStore';
import type { Product, ProductUnit } from '@/domain/models';
import type { CartLine } from './pos.types';
import {
  billableLines,
  cartItemsCount,
  cartLineKey,
  cartTotal,
  defaultUnit,
  fromParkedLines,
  nextCartLineKey,
} from './pos.utils';

interface UsePosCartOptions {
  /** Precio de catálogo de la sucursal para producto + presentación. */
  getPrice: (productId: string, productUnitId: string) => number | undefined;
}

/**
 * Carrito del punto de venta.
 *
 * Guarda las líneas y sus mutaciones; no sabe nada del cobro, del cliente ni de
 * la pantalla. Cada línea oculta con el "ojito" sigue en el carrito pero no
 * cuenta para el total ni se cobra.
 */
export function usePosCart({ getPrice }: UsePosCartOptions) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const billable = useMemo(() => billableLines(lines), [lines]);
  const total = useMemo(() => cartTotal(billable), [billable]);
  // Las unidades que se muestran son las que se cobran: las ocultas no cuentan.
  const itemsCount = useMemo(() => cartItemsCount(billable), [billable]);

  /**
   * Agrega un producto con su presentación por defecto y el precio de catálogo.
   * Dos líneas del mismo producto y presentación se suman. Devuelve `false` si
   * el producto no tiene presentaciones activas, para que la pantalla avise.
   */
  const addProduct = useCallback(
    (product: Product): boolean => {
      const unit = defaultUnit(product);
      if (!unit) return false;

      const unitPrice = getPrice(product.id, unit.id) ?? 0;
      const key = cartLineKey(product.id, unit.id);

      setLines((prev) => {
        const existing = prev.find(
          (line) => cartLineKey(line.product_id, line.product_unit_id) === key,
        );

        if (existing) {
          return prev.map((line) =>
            line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
          );
        }

        return [
          ...prev,
          {
            key: nextCartLineKey(),
            product_id: product.id,
            product_unit_id: unit.id,
            product_name: product.name,
            unit_name: unit.name,
            quantity: 1,
            unit_price: unitPrice,
            is_hidden: false,
          },
        ];
      });

      return true;
    },
    [getPrice],
  );

  const updateLine = useCallback((key: string, changes: Partial<CartLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...changes } : line)));
  }, []);

  /** Cambia la presentación de una línea y refresca su precio de catálogo. */
  const changeUnit = useCallback(
    (line: CartLine, unit: ProductUnit) => {
      setLines((prev) =>
        prev.map((current) =>
          current.key === line.key
            ? {
                ...current,
                product_unit_id: unit.id,
                unit_name: unit.name,
                unit_price: getPrice(line.product_id, unit.id) ?? current.unit_price,
              }
            : current,
        ),
      );
    },
    [getPrice],
  );

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }, []);

  /** Oculta/muestra una línea: oculta no cuenta en el total ni se cobra. */
  const toggleLineHidden = useCallback((key: string) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, is_hidden: !line.is_hidden } : line)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  /** Retoma un ticket en espera: el carrito vuelve con claves nuevas. */
  const restore = useCallback((parkedLines: ParkedSaleLine[]) => {
    setLines(fromParkedLines(parkedLines));
  }, []);

  return {
    lines,
    billable,
    total,
    itemsCount,
    addProduct,
    updateLine,
    changeUnit,
    removeLine,
    toggleLineHidden,
    clear,
    restore,
  };
}
