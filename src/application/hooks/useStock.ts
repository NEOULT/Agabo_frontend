import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { PosStockLevels } from '@/application/hooks/pos/pos.types';
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
   * Existencia del almacén de origen indexada por producto, con su desglose por
   * ubicación (RN-INV-003: una fila por producto + almacén + ubicación).
   *
   * La cantidad disponible es la **suma de todas las ubicaciones**: una venta
   * sin ubicación puede tomar mercancía de cualquiera de ellas, así que mirar
   * solo la fila sin ubicación da por agotado lo que sí está en un estante.
   * El desglose se conserva para imputar cada línea de la venta a una ubicación
   * concreta. Se pide el almacén completo en una sola consulta en lugar de una
   * por producto.
   */
  const fetchAvailableStock = useCallback(
    async (warehouseId: string): Promise<PosStockLevels> => {
      const { data } = await stockRepo.getAll({ warehouseId, isActive: true });

      return data.reduce<PosStockLevels>((levels, stock) => {
        const quantity = Number(stock.quantity);

        // Las filas en cero no aportan ni se pueden vender.
        if (!(quantity > 0)) return levels;

        const level = levels[stock.product_id] ?? { total: 0, locations: [] };
        level.total += quantity;
        level.locations.push({ location_id: stock.location_id, quantity });
        levels[stock.product_id] = level;

        return levels;
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
    fetchAvailableStock,
    createStock,
    updateStock,
    activateStock,
    deactivateStock,
  };
}
