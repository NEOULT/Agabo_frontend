import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { PosStockLevels } from '@/application/hooks/pos/pos.types';
import type {
  Stock,
  StockProductOption,
  StockWarehouseOption,
  CreateStockDTO,
  UpdateStockDTO,
} from '@/domain/models';
import type { StockOverviewParams, StockQueryParams } from '@/domain/repositories';

/**
 * Existencias de inventario (`inventory.stock`).
 *
 * Solo puede existir una existencia por producto y almacén (RN-INV-003). Se
 * registra manualmente o como consecuencia de un movimiento; se desactiva en
 * lugar de borrarse.
 *
 * `fetchOverview` llena la pantalla de existencias con una sola llamada:
 * existencias, productos y almacenes vienen del mismo endpoint.
 */
export function useStock() {
  const { stocks: stockRepo } = useRepositories();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<StockProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<StockWarehouseOption[]>([]);
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
   * Carga en una sola petición las existencias, los productos y los almacenes
   * que necesita la pantalla de gestión (`GET /api/stocks/overview`).
   */
  const fetchOverview = useCallback(
    async (params?: StockOverviewParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const overview = await stockRepo.getOverview(params);
        setStocks(overview.items);
        setProducts(overview.products);
        setWarehouses(overview.warehouses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar existencias');
      } finally {
        setIsLoading(false);
      }
    },
    [stockRepo],
  );

  /**
   * Existencia del almacén de origen indexada por producto (RN-INV-003: una
   * fila por producto + almacén). La cantidad está en unidades base.
   */
  const fetchAvailableStock = useCallback(
    async (warehouseId: string): Promise<PosStockLevels> => {
      const { data } = await stockRepo.getAll({ warehouseId, isActive: true });

      return data.reduce<PosStockLevels>((levels, stock) => {
        const quantity = Number(stock.quantity);

        // Las filas en cero no aportan ni se pueden vender.
        if (!(quantity > 0)) return levels;

        levels[stock.product_id] = (levels[stock.product_id] ?? 0) + quantity;
        return levels;
      }, {});
    },
    [stockRepo],
  );

  const createStock = useCallback(
    async (data: CreateStockDTO) => {
      const stock = await stockRepo.create(data);
      // Si ya existía la existencia del producto/almacén, se reemplaza en vez
      // de duplicar la fila en la lista.
      setStocks((prev) => {
        const exists = prev.some((item) => item.id === stock.id);
        return exists ? prev.map((item) => (item.id === stock.id ? stock : item)) : [...prev, stock];
      });
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
    products,
    warehouses,
    isLoading,
    error,
    fetchStocks,
    fetchOverview,
    fetchAvailableStock,
    createStock,
    updateStock,
    activateStock,
    deactivateStock,
  };
}
