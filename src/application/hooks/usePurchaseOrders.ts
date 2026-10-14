import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { PurchaseOrder, CreatePurchaseOrderDTO } from '@/domain/models';
import type { PurchaseOrderQueryParams } from '@/domain/repositories';

/**
 * Órdenes de compra (purchases.purchase_order).
 *
 * Las órdenes son inmutables: solo se crean y se consultan. El estado
 * (pendiente/recibida) lo deriva el backend a partir de la recepción.
 */
export function usePurchaseOrders() {
  const { purchaseOrders: orderRepo } = useRepositories();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (params?: PurchaseOrderQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await orderRepo.getAll(params);
      setOrders(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar órdenes de compra');
    } finally {
      setIsLoading(false);
    }
  }, [orderRepo]);

  const getOrder = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const order = await orderRepo.getById(id);
      setSelectedOrder(order);
      return order;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la orden');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [orderRepo]);

  const createOrder = useCallback(async (data: CreatePurchaseOrderDTO) => {
    const order = await orderRepo.create(data);
    setOrders((prev) => [order, ...prev]);
    return order;
  }, [orderRepo]);

  /** Recarga la orden seleccionada (tras registrar su recepción). */
  const refreshSelected = useCallback(async (id: string) => {
    const order = await orderRepo.getById(id);
    if (order) {
      setSelectedOrder(order);
      setOrders((prev) => prev.map((o) => (o.id === id ? order : o)));
    }
    return order;
  }, [orderRepo]);

  return {
    orders,
    selectedOrder,
    isLoading,
    error,
    fetchOrders,
    getOrder,
    createOrder,
    refreshSelected,
  };
}
