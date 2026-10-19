import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';

/** Clave del mapa de precios: producto. */
export function priceKey(productId: string): string {
  return productId;
}

/**
 * Precios vigentes de una sucursal (catalog.price_list / price_product).
 *
 * El punto de venta necesita el precio al agregar el producto para mostrar el
 * total en vivo. Se carga la lista activa de la sucursal y se arma un mapa
 * `producto → precio`. Cuando una sucursal tiene varias listas activas, gana el
 * precio más reciente, igual que el backend (RN-CAT-007 /
 * `find-active-for-branch`).
 */
export function usePrices() {
  const { priceLists: priceListRepo, priceProducts: priceProductRepo } = useRepositories();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrices = useCallback(
    async (branchId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const lists = await priceListRepo.getAll({ branchId, isActive: true });

        if (lists.data.length === 0) {
          setPrices({});
          return;
        }

        const perList = await Promise.all(
          lists.data.map((list) =>
            priceProductRepo.getAll({ priceListId: list.id, isActive: true }),
          ),
        );

        // De más antiguo a más reciente: el último en escribirse gana.
        const rows = perList
          .flatMap((result) => result.data)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));

        const map: Record<string, number> = {};
        for (const row of rows) {
          map[priceKey(row.product_id)] = row.price;
        }
        setPrices(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar precios');
        setPrices({});
      } finally {
        setIsLoading(false);
      }
    },
    [priceListRepo, priceProductRepo],
  );

  const getPrice = useCallback(
    (productId: string): number | undefined => prices[priceKey(productId)],
    [prices],
  );

  return { prices, isLoading, error, loadPrices, getPrice };
}
