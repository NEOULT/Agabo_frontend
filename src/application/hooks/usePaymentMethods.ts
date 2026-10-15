import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type {
  PaymentMethod,
  CreatePaymentMethodDTO,
  UpdatePaymentMethodDTO,
} from '@/domain/models';
import type { PaymentMethodQueryParams } from '@/domain/repositories';

/**
 * Métodos de pago (sales.payment_method).
 *
 * El estado vive en el hook: cada página filtra por búsqueda y estado. No se
 * eliminan: se activan/desactivan.
 */
export function usePaymentMethods() {
  const { paymentMethods: paymentMethodRepo } = useRepositories();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async (params?: PaymentMethodQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await paymentMethodRepo.getAll(params);
      setPaymentMethods(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar métodos de pago');
    } finally {
      setIsLoading(false);
    }
  }, [paymentMethodRepo]);

  const getPaymentMethod = useCallback(async (id: string) => {
    return paymentMethodRepo.getById(id);
  }, [paymentMethodRepo]);

  const createPaymentMethod = useCallback(async (data: CreatePaymentMethodDTO) => {
    const paymentMethod = await paymentMethodRepo.create(data);
    setPaymentMethods((prev) => [...prev, paymentMethod]);
    return paymentMethod;
  }, [paymentMethodRepo]);

  const updatePaymentMethod = useCallback(async (id: string, data: UpdatePaymentMethodDTO) => {
    const paymentMethod = await paymentMethodRepo.update(id, data);
    setPaymentMethods((prev) => prev.map((p) => (p.id === id ? paymentMethod : p)));
    return paymentMethod;
  }, [paymentMethodRepo]);

  const activatePaymentMethod = useCallback(async (id: string) => {
    const paymentMethod = await paymentMethodRepo.setActive(id);
    setPaymentMethods((prev) => prev.map((p) => (p.id === id ? paymentMethod : p)));
    return paymentMethod;
  }, [paymentMethodRepo]);

  const deactivatePaymentMethod = useCallback(async (id: string) => {
    const paymentMethod = await paymentMethodRepo.setInactive(id);
    setPaymentMethods((prev) => prev.map((p) => (p.id === id ? paymentMethod : p)));
    return paymentMethod;
  }, [paymentMethodRepo]);

  return {
    paymentMethods,
    isLoading,
    error,
    fetchPaymentMethods,
    getPaymentMethod,
    createPaymentMethod,
    updatePaymentMethod,
    activatePaymentMethod,
    deactivatePaymentMethod,
  };
}
