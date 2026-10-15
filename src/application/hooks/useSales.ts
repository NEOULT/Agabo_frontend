import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Sale, CreateSaleDTO } from '@/domain/models';
import type { SaleQueryParams } from '@/domain/repositories';

/**
 * Ventas (sales.sale).
 *
 * Las ventas son inmutables: solo se crean y se consultan. El estado de pago
 * (pendiente/parcial/pagada) lo deriva el backend de los pagos activos.
 */
export function useSales() {
  const { sales: saleRepo } = useRepositories();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async (params?: SaleQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await saleRepo.getAll(params);
      setSales(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ventas');
    } finally {
      setIsLoading(false);
    }
  }, [saleRepo]);

  const getSale = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const sale = await saleRepo.getById(id);
      setSelectedSale(sale);
      return sale;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la venta');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [saleRepo]);

  const createSale = useCallback(async (data: CreateSaleDTO) => {
    const sale = await saleRepo.create(data);
    setSales((prev) => [sale, ...prev]);
    return sale;
  }, [saleRepo]);

  /** Recarga la venta seleccionada (tras registrar o desactivar un pago). */
  const refreshSelected = useCallback(async (id: string) => {
    const sale = await saleRepo.getById(id);
    if (sale) {
      setSelectedSale(sale);
      setSales((prev) => prev.map((s) => (s.id === id ? sale : s)));
    }
    return sale;
  }, [saleRepo]);

  return {
    sales,
    selectedSale,
    isLoading,
    error,
    fetchSales,
    getSale,
    createSale,
    refreshSelected,
  };
}
