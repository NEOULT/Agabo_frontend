import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { PurchaseReceipt, CreatePurchaseReceiptDTO } from '@/domain/models';
import type { PurchaseReceiptQueryParams } from '@/domain/repositories';

/**
 * Recepciones de compra (purchases.purchase_receipt).
 *
 * Son inmutables y únicas por orden: solo se crean y se consultan.
 */
export function usePurchaseReceipts() {
  const { purchaseReceipts: receiptRepo } = useRepositories();
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async (params?: PurchaseReceiptQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await receiptRepo.getAll(params);
      setReceipts(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar recepciones');
    } finally {
      setIsLoading(false);
    }
  }, [receiptRepo]);

  const getReceipt = useCallback(async (id: string) => {
    return receiptRepo.getById(id);
  }, [receiptRepo]);

  const createReceipt = useCallback(async (data: CreatePurchaseReceiptDTO) => {
    const receipt = await receiptRepo.create(data);
    setReceipts((prev) => [receipt, ...prev]);
    return receipt;
  }, [receiptRepo]);

  return {
    receipts,
    isLoading,
    error,
    fetchReceipts,
    getReceipt,
    createReceipt,
  };
}
