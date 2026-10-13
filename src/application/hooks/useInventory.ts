import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Movement, CreateMovementDTO } from '@/domain/models';

export function useInventory() {
  const { movements: movementRepo } = useRepositories();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async (params?: {
    branchId?: string;
    productId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await movementRepo.getAll(params);
      setMovements(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
    } finally {
      setIsLoading(false);
    }
  }, [movementRepo]);

  const createMovement = useCallback(async (data: CreateMovementDTO) => {
    const movement = await movementRepo.create(data);
    setMovements((prev) => [movement, ...prev]);
    return movement;
  }, [movementRepo]);

  const getProductMovements = useCallback(async (productId: string) => {
    setIsLoading(true);
    try {
      const result = await movementRepo.getByProduct(productId);
      setMovements(result.data);
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [movementRepo]);

  return {
    movements,
    total,
    isLoading,
    error,
    fetchMovements,
    createMovement,
    getProductMovements,
  };
}
