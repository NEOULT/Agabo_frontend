import { useCallback } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import { useProductStore } from '@/application/stores/useProductStore';
import type { CreateProductDTO, UpdateProductDTO } from '@/domain/models';
import type { ProductQueryParams } from '@/domain/repositories';

export function useProducts() {
  const { products: productRepo } = useRepositories();

  // Selectores individuales para evitar re-renders innecesarios
  const products = useProductStore((state) => state.products);
  const selectedProduct = useProductStore((state) => state.selectedProduct);
  const stockByBranch = useProductStore((state) => state.stockByBranch);
  const total = useProductStore((state) => state.total);
  const isLoading = useProductStore((state) => state.isLoading);
  const error = useProductStore((state) => state.error);

  const fetchProducts = useCallback(async (params?: ProductQueryParams) => {
    useProductStore.getState().setLoading(true);
    useProductStore.getState().setError(null);
    try {
      const result = await productRepo.getAll(params);
      useProductStore.getState().setProducts(result.data);
      useProductStore.getState().setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar productos';
      useProductStore.getState().setError(message);
    } finally {
      useProductStore.getState().setLoading(false);
    }
  }, [productRepo]);

  const getProduct = useCallback(async (id: string) => {
    useProductStore.getState().setLoading(true);
    useProductStore.getState().setError(null);
    try {
      const product = await productRepo.getById(id);
      useProductStore.getState().setSelectedProduct(product);
      return product;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar producto';
      useProductStore.getState().setError(message);
      return null;
    } finally {
      useProductStore.getState().setLoading(false);
    }
  }, [productRepo]);

  const getStockByBranch = useCallback(async (productId: string) => {
    try {
      const stock = await productRepo.getStockByBranch(productId);
      useProductStore.getState().setStockByBranch(stock);
      return stock;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar stock';
      useProductStore.getState().setError(message);
      return [];
    }
  }, [productRepo]);

  const createProduct = useCallback(async (data: CreateProductDTO) => {
    const product = await productRepo.create(data);
    useProductStore.getState().addProduct(product);
    return product;
  }, [productRepo]);

  const updateProduct = useCallback(async (id: string, data: UpdateProductDTO) => {
    const product = await productRepo.update(id, data);
    useProductStore.getState().updateProduct(product);
    return product;
  }, [productRepo]);

  const deleteProduct = useCallback(async (id: string) => {
    await productRepo.delete(id);
    useProductStore.getState().removeProduct(id);
  }, [productRepo]);

  return {
    products,
    selectedProduct,
    stockByBranch,
    total,
    isLoading,
    error,
    fetchProducts,
    getProduct,
    getStockByBranch,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
