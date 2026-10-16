import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Stock, CreateStockDTO, UpdateStockDTO } from '@/domain/models';
import type { StockQueryParams } from '@/domain/repositories';

/**
 * Existencias de inventario (`inventory.stock`).
 *
 * Solo puede existir una existencia por producto, almacén y ubicación
 * (RN-INV-003). Se registra manualmente o como consecuencia de un movimiento;
 * se desactiva en lugar de borrarse.
 */
export function useStock() {
  const { stocks: stockRepo } = useRepositories();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStocks = useCallback(
    async (params?: StockQueryParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await stockRepo.getAll(params);
        setStocks(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar existencias');
      } finally {
        setIsLoading(false);
      }
    },
    [stockRepo],
  );

  /**
   * Existencia disponible por producto en un almacén, para cobrar/despachar.
   *
   * Una venta del POS no lleva ubicación, e inventory descuenta la fila **sin
   * ubicación** del almacén (`stock.decrement` compara `location_uuid IS NOT
   * DISTINCT FROM null`), así que la existencia que cuenta es esa fila: repartir
   * el total del almacén daría por disponible mercancía que la venta no puede
   * tomar. Devuelve `{ product_id: cantidad }`.
   */
  const fetchAvailability = useCallback(
    async (warehouseId: string, productIds: string[]): Promise<Record<string, number>> => {
      const uniqueIds = [...new Set(productIds)];

      const results = await Promise.all(
        uniqueIds.map((productId) => stockRepo.getAll({ productId, warehouseId })),
      );

      return uniqueIds.reduce<Record<string, number>>((availability, productId, index) => {
        availability[productId] = results[index].data
          .filter((stock) => !stock.location_id)
          .reduce((sum, stock) => sum + Number(stock.quantity), 0);
        return availability;
      }, {});
    },
    [stockRepo],
  );

  const createStock = useCallback(
    async (data: CreateStockDTO) => {
      const stock = await stockRepo.create(data);
      setStocks((prev) => [...prev, stock]);
      return stock;
    },
    [stockRepo],
  );

  const updateStock = useCallback(
    async (id: string, data: UpdateStockDTO) => {
      const stock = await stockRepo.update(id, data);
      setStocks((prev) => prev.map((s) => (s.id === id ? stock : s)));
      return stock;
    },
    [stockRepo],
  );

  const activateStock = useCallback(
    async (id: string) => {
      const stock = await stockRepo.setActive(id);
      setStocks((prev) => prev.map((s) => (s.id === id ? stock : s)));
      return stock;
    },
    [stockRepo],
  );

  const deactivateStock = useCallback(
    async (id: string) => {
      const stock = await stockRepo.setInactive(id);
      setStocks((prev) => prev.map((s) => (s.id === id ? stock : s)));
      return stock;
    },
    [stockRepo],
  );

  return {
    stocks,
    isLoading,
    error,
    fetchStocks,
    fetchAvailability,
    createStock,
    updateStock,
    activateStock,
    deactivateStock,
  };
}
