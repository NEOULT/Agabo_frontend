import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/domain/models';
import type { CategoryQueryParams } from '@/domain/repositories';

/** Categorías (catalog.category) con estado local por página. */
export function useCategories() {
  const { categories: categoryRepo } = useRepositories();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (params?: CategoryQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await categoryRepo.getAll(params);
      setCategories(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  }, [categoryRepo]);

  const getCategory = useCallback(async (id: string) => {
    return categoryRepo.getById(id);
  }, [categoryRepo]);

  const createCategory = useCallback(async (data: CreateCategoryDTO) => {
    const category = await categoryRepo.create(data);
    setCategories((prev) => [...prev, category]);
    return category;
  }, [categoryRepo]);

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryDTO) => {
    const category = await categoryRepo.update(id, data);
    setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
    return category;
  }, [categoryRepo]);

  const activateCategory = useCallback(async (id: string) => {
    const category = await categoryRepo.setActive(id);
    setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
    return category;
  }, [categoryRepo]);

  const deactivateCategory = useCallback(async (id: string) => {
    const category = await categoryRepo.setInactive(id);
    setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
    return category;
  }, [categoryRepo]);

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    getCategory,
    createCategory,
    updateCategory,
    activateCategory,
    deactivateCategory,
  };
}
