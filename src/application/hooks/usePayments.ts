import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { SalePayment, CreatePaymentDTO } from '@/domain/models';
import type { PaymentQueryParams } from '@/domain/repositories';

/**
 * Pagos (sales.payment).
 *
 * Un pago no se elimina: se desactiva y deja de contar para el saldo de la
 * venta (RF-SAL-015).
 */
export function usePayments() {
  const { payments: paymentRepo } = useRepositories();
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (params?: PaymentQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await paymentRepo.getAll(params);
      setPayments(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setIsLoading(false);
    }
  }, [paymentRepo]);

  const createPayment = useCallback(async (data: CreatePaymentDTO) => {
    const payment = await paymentRepo.create(data);
    setPayments((prev) => [payment, ...prev]);
    return payment;
  }, [paymentRepo]);

  const activatePayment = useCallback(async (id: string) => {
    const payment = await paymentRepo.setActive(id);
    setPayments((prev) => prev.map((p) => (p.id === id ? payment : p)));
    return payment;
  }, [paymentRepo]);

  const deactivatePayment = useCallback(async (id: string) => {
    const payment = await paymentRepo.setInactive(id);
    setPayments((prev) => prev.map((p) => (p.id === id ? payment : p)));
    return payment;
  }, [paymentRepo]);

  return {
    payments,
    isLoading,
    error,
    fetchPayments,
    createPayment,
    activatePayment,
    deactivatePayment,
  };
}
