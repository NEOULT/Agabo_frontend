import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  CreateProductCodeDTO,
  UpdateProductCodeDTO,
  CreatePresentationDTO,
  UpdatePresentationDTO,
} from '@/domain/models';
import type { ProductQueryParams } from '@/domain/repositories';

/**
 * Catálogo de productos (catalog.product).
 *
 * Incluye las operaciones de sus sub-entidades (códigos y presentaciones),
 * que se administran desde el detalle del producto. Tras cada cambio en una
 * sub-entidad se refresca el producto seleccionado para mantener los datos
 * al día.
 */
export function useProducts() {
  const { products: productRepo } = useRepositories();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (params?: ProductQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await productRepo.getAll(params);
      setProducts(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  }, [productRepo]);

  const getProduct = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const product = await productRepo.getById(id);
      setSelectedProduct(product);
      return product;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar producto');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [productRepo]);

  const createProduct = useCallback(async (data: CreateProductDTO) => {
    const product = await productRepo.create(data);
    setProducts((prev) => [...prev, product]);
    return product;
  }, [productRepo]);

  const updateProduct = useCallback(async (id: string, data: UpdateProductDTO) => {
    const product = await productRepo.update(id, data);
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
    setSelectedProduct((prev) => (prev?.id === id ? product : prev));
    return product;
  }, [productRepo]);

  const activateProduct = useCallback(async (id: string) => {
    const product = await productRepo.setActive(id);
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
    return product;
  }, [productRepo]);

  const deactivateProduct = useCallback(async (id: string) => {
    const product = await productRepo.setInactive(id);
    setProducts((prev) => prev.map((p) => (p.id === id ? product : p)));
    return product;
  }, [productRepo]);

  // --- Códigos -------------------------------------------------------------
  /** Refresca el producto seleccionado (tras crear/editar/retirar códigos). */
  const refreshSelected = useCallback(async (productId: string) => {
    const product = await productRepo.getById(productId);
    if (product) setSelectedProduct(product);
    return product;
  }, [productRepo]);

  const createCode = useCallback(async (data: CreateProductCodeDTO) => {
    const code = await productRepo.createCode(data);
    await refreshSelected(data.product_id);
    return code;
  }, [productRepo, refreshSelected]);

  const updateCode = useCallback(async (productId: string, id: string, data: UpdateProductCodeDTO) => {
    const code = await productRepo.updateCode(id, data);
    await refreshSelected(productId);
    return code;
  }, [productRepo, refreshSelected]);

  const removeCode = useCallback(async (productId: string, id: string) => {
    await productRepo.removeCode(id);
    await refreshSelected(productId);
  }, [productRepo, refreshSelected]);

  // --- Presentaciones ------------------------------------------------------
  const createPresentation = useCallback(async (data: CreatePresentationDTO) => {
    const presentation = await productRepo.createPresentation(data);
    await refreshSelected(data.product_id);
    return presentation;
  }, [productRepo, refreshSelected]);

  const updatePresentation = useCallback(async (productId: string, id: string, data: UpdatePresentationDTO) => {
    const presentation = await productRepo.updatePresentation(id, data);
    await refreshSelected(productId);
    return presentation;
  }, [productRepo, refreshSelected]);

  const activatePresentation = useCallback(async (productId: string, id: string) => {
    const presentation = await productRepo.setPresentationActive(id);
    await refreshSelected(productId);
    return presentation;
  }, [productRepo, refreshSelected]);

  const deactivatePresentation = useCallback(async (productId: string, id: string) => {
    const presentation = await productRepo.setPresentationInactive(id);
    await refreshSelected(productId);
    return presentation;
  }, [productRepo, refreshSelected]);

  return {
    products,
    selectedProduct,
    isLoading,
    error,
    fetchProducts,
    getProduct,
    createProduct,
    updateProduct,
    activateProduct,
    deactivateProduct,
    createCode,
    updateCode,
    removeCode,
    createPresentation,
    updatePresentation,
    activatePresentation,
    deactivatePresentation,
  };
}
