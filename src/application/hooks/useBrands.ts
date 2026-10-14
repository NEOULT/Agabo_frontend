import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Brand, CreateBrandDTO, UpdateBrandDTO } from '@/domain/models';
import type { BrandQueryParams } from '@/domain/repositories';

/** Marcas (catalog.brand) con estado local por página. */
export function useBrands() {
  const { brands: brandRepo } = useRepositories();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = useCallback(async (params?: BrandQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await brandRepo.getAll(params);
      setBrands(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar marcas');
    } finally {
      setIsLoading(false);
    }
  }, [brandRepo]);

  const getBrand = useCallback(async (id: string) => {
    return brandRepo.getById(id);
  }, [brandRepo]);

  const createBrand = useCallback(async (data: CreateBrandDTO) => {
    const brand = await brandRepo.create(data);
    setBrands((prev) => [...prev, brand]);
    return brand;
  }, [brandRepo]);

  const updateBrand = useCallback(async (id: string, data: UpdateBrandDTO) => {
    const brand = await brandRepo.update(id, data);
    setBrands((prev) => prev.map((b) => (b.id === id ? brand : b)));
    return brand;
  }, [brandRepo]);

  const activateBrand = useCallback(async (id: string) => {
    const brand = await brandRepo.setActive(id);
    setBrands((prev) => prev.map((b) => (b.id === id ? brand : b)));
    return brand;
  }, [brandRepo]);

  const deactivateBrand = useCallback(async (id: string) => {
    const brand = await brandRepo.setInactive(id);
    setBrands((prev) => prev.map((b) => (b.id === id ? brand : b)));
    return brand;
  }, [brandRepo]);

  return {
    brands,
    isLoading,
    error,
    fetchBrands,
    getBrand,
    createBrand,
    updateBrand,
    activateBrand,
    deactivateBrand,
  };
}
