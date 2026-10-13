import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '@/domain/models';
import type { SupplierQueryParams } from '@/domain/repositories';

/**
 * Proveedores (purchases.supplier).
 *
 * El estado vive en el hook (igual que almacenes/ubicaciones): cada página
 * filtra por búsqueda y estado según lo que esté viendo.
 */
export function useSuppliers() {
  const { suppliers: supplierRepo } = useRepositories();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async (params?: SupplierQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await supplierRepo.getAll(params);
      setSuppliers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proveedores');
    } finally {
      setIsLoading(false);
    }
  }, [supplierRepo]);

  const getSupplier = useCallback(async (id: string) => {
    return supplierRepo.getById(id);
  }, [supplierRepo]);

  const createSupplier = useCallback(async (data: CreateSupplierDTO) => {
    const supplier = await supplierRepo.create(data);
    setSuppliers((prev) => [...prev, supplier]);
    return supplier;
  }, [supplierRepo]);

  const updateSupplier = useCallback(async (id: string, data: UpdateSupplierDTO) => {
    const supplier = await supplierRepo.update(id, data);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? supplier : s)));
    return supplier;
  }, [supplierRepo]);

  const activateSupplier = useCallback(async (id: string) => {
    const supplier = await supplierRepo.setActive(id);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? supplier : s)));
    return supplier;
  }, [supplierRepo]);

  const deactivateSupplier = useCallback(async (id: string) => {
    const supplier = await supplierRepo.setInactive(id);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? supplier : s)));
    return supplier;
  }, [supplierRepo]);

  return {
    suppliers,
    isLoading,
    error,
    fetchSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
    activateSupplier,
    deactivateSupplier,
  };
}
