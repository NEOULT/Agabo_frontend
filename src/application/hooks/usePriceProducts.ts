import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type {
  PriceProduct,
  CreatePriceProductDTO,
  UpdatePriceProductDTO,
} from '@/domain/models';
import type { PriceProductQueryParams } from '@/domain/repositories';

/**
 * Precios de producto (catalog.price_product) de una lista de precios.
 *
 * Un precio liga una lista con una presentación de un producto; no se elimina:
 * se retira con desactivación (RF-CAT-026).
 */
export function usePriceProducts() {
  const { priceProducts: priceProductRepo } = useRepositories();
  const [priceProducts, setPriceProducts] = useState<PriceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPriceProducts = useCallback(async (params?: PriceProductQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await priceProductRepo.getAll(params);
      setPriceProducts(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar precios');
    } finally {
      setIsLoading(false);
    }
  }, [priceProductRepo]);

  /** Limpia la tabla al cambiar de lista, antes de que llegue la respuesta. */
  const clearPriceProducts = useCallback(() => {
    setPriceProducts([]);
  }, []);

  const createPriceProduct = useCallback(async (data: CreatePriceProductDTO) => {
    const priceProduct = await priceProductRepo.create(data);
    setPriceProducts((prev) => [...prev, priceProduct]);
    return priceProduct;
  }, [priceProductRepo]);

  const updatePriceProduct = useCallback(async (id: string, data: UpdatePriceProductDTO) => {
    const priceProduct = await priceProductRepo.update(id, data);
    setPriceProducts((prev) => prev.map((p) => (p.id === id ? priceProduct : p)));
    return priceProduct;
  }, [priceProductRepo]);

  const activatePriceProduct = useCallback(async (id: string) => {
    const priceProduct = await priceProductRepo.setActive(id);
    setPriceProducts((prev) => prev.map((p) => (p.id === id ? priceProduct : p)));
    return priceProduct;
  }, [priceProductRepo]);

  const deactivatePriceProduct = useCallback(async (id: string) => {
    const priceProduct = await priceProductRepo.setInactive(id);
    setPriceProducts((prev) => prev.map((p) => (p.id === id ? priceProduct : p)));
    return priceProduct;
  }, [priceProductRepo]);

  return {
    priceProducts,
    isLoading,
    error,
    fetchPriceProducts,
    clearPriceProducts,
    createPriceProduct,
    updatePriceProduct,
    activatePriceProduct,
    deactivatePriceProduct,
  };
}
