import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type {
  PriceList,
  CreatePriceListDTO,
  UpdatePriceListDTO,
} from '@/domain/models';
import type { PriceListQueryParams } from '@/domain/repositories';

/**
 * Listas de precios (catalog.price_list).
 *
 * Cada lista pertenece a una sucursal; el estado vive en el hook y las listas
 * nunca se eliminan: se activan/desactivan (RF-CAT-022).
 */
export function usePriceLists() {
  const { priceLists: priceListRepo } = useRepositories();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPriceLists = useCallback(async (params?: PriceListQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await priceListRepo.getAll(params);
      setPriceLists(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar listas de precios');
    } finally {
      setIsLoading(false);
    }
  }, [priceListRepo]);

  const getPriceList = useCallback(async (id: string) => {
    return priceListRepo.getById(id);
  }, [priceListRepo]);

  const createPriceList = useCallback(async (data: CreatePriceListDTO) => {
    const priceList = await priceListRepo.create(data);
    setPriceLists((prev) => [...prev, priceList]);
    return priceList;
  }, [priceListRepo]);

  const updatePriceList = useCallback(async (id: string, data: UpdatePriceListDTO) => {
    const priceList = await priceListRepo.update(id, data);
    setPriceLists((prev) => prev.map((p) => (p.id === id ? priceList : p)));
    return priceList;
  }, [priceListRepo]);

  const activatePriceList = useCallback(async (id: string) => {
    const priceList = await priceListRepo.setActive(id);
    setPriceLists((prev) => prev.map((p) => (p.id === id ? priceList : p)));
    return priceList;
  }, [priceListRepo]);

  const deactivatePriceList = useCallback(async (id: string) => {
    const priceList = await priceListRepo.setInactive(id);
    setPriceLists((prev) => prev.map((p) => (p.id === id ? priceList : p)));
    return priceList;
  }, [priceListRepo]);

  return {
    priceLists,
    isLoading,
    error,
    fetchPriceLists,
    getPriceList,
    createPriceList,
    updatePriceList,
    activatePriceList,
    deactivatePriceList,
  };
}
