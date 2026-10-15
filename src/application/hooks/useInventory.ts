import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Movement, CreateMovementDTO } from '@/domain/models';
import type { MovementQueryParams } from '@/domain/repositories';

/**
 * Movimientos de inventario (`inventory.inventory_movement`).
 *
 * Un movimiento es inmutable: para corregir uno se registra su anulación con
 * `reverseMovement` (RF-INV-016), que crea el movimiento inverso.
 */
export function useInventory() {
  const { movements: movementRepo } = useRepositories();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(
    async (params?: MovementQueryParams) => {
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
    },
    [movementRepo],
  );

  const getMovement = useCallback(
    async (id: string) => movementRepo.getById(id),
    [movementRepo],
  );

  const createMovement = useCallback(
    async (data: CreateMovementDTO) => {
      const movement = await movementRepo.create(data);
      setMovements((prev) => [movement, ...prev]);
      return movement;
    },
    [movementRepo],
  );

  const reverseMovement = useCallback(
    async (id: string, note?: string) => {
      const reversal = await movementRepo.reverse(id, note);
      setMovements((prev) => [reversal, ...prev]);
      return reversal;
    },
    [movementRepo],
  );

  /** Kardex de un producto (RF-INV-024); deja el resultado en el estado. */
  const getProductMovements = useCallback(
    async (productId: string, params?: MovementQueryParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await movementRepo.getByProduct(productId, params);
        setMovements(result.data);
        setTotal(result.total);
        return result.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [movementRepo],
  );

  return {
    movements,
    total,
    isLoading,
    error,
    fetchMovements,
    getMovement,
    createMovement,
    reverseMovement,
    getProductMovements,
  };
}
