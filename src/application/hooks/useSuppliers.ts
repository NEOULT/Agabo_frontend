import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type {
  Supplier,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  PurchaseOrder,
  CreatePurchaseOrderDTO,
} from '@/domain/models';

export function useSuppliers() {
  const { suppliers: supplierRepo } = useRepositories();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async (params?: { search?: string }) => {
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

  const deleteSupplier = useCallback(async (id: string) => {
    await supplierRepo.delete(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, [supplierRepo]);

  const fetchPurchaseOrders = useCallback(async (params?: { supplierId?: string; branchId?: string }) => {
    setIsLoading(true);
    try {
      const orders = await supplierRepo.getPurchaseOrders(params);
      setPurchaseOrders(orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar órdenes de compra');
    } finally {
      setIsLoading(false);
    }
  }, [supplierRepo]);

  const createPurchaseOrder = useCallback(async (data: CreatePurchaseOrderDTO) => {
    const order = await supplierRepo.createPurchaseOrder(data);
    setPurchaseOrders((prev) => [...prev, order]);
    return order;
  }, [supplierRepo]);

  return {
    suppliers,
    purchaseOrders,
    isLoading,
    error,
    fetchSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    fetchPurchaseOrders,
    createPurchaseOrder,
  };
}
