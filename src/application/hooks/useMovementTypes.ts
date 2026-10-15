import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type {
  MovementType,
  CreateMovementTypeDTO,
  UpdateMovementTypeDTO,
} from '@/domain/models';
import type { MovementTypeQueryParams } from '@/domain/repositories';

/**
 * Tipos de movimiento (`inventory.movement_type`).
 *
 * El estado vive en el hook: cada pantalla filtra por propósito, búsqueda y
 * estado. No hay borrado; se activa o desactiva (RF-INV-004).
 */
export function useMovementTypes() {
  const { movementTypes: movementTypeRepo } = useRepositories();
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovementTypes = useCallback(
    async (params?: MovementTypeQueryParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await movementTypeRepo.getAll(params);
        setMovementTypes(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar tipos de movimiento');
      } finally {
        setIsLoading(false);
      }
    },
    [movementTypeRepo],
  );

  const getMovementType = useCallback(
    async (id: string) => movementTypeRepo.getById(id),
    [movementTypeRepo],
  );

  const createMovementType = useCallback(
    async (data: CreateMovementTypeDTO) => {
      const movementType = await movementTypeRepo.create(data);
      setMovementTypes((prev) => [...prev, movementType]);
      return movementType;
    },
    [movementTypeRepo],
  );

  const updateMovementType = useCallback(
    async (id: string, data: UpdateMovementTypeDTO) => {
      const movementType = await movementTypeRepo.update(id, data);
      setMovementTypes((prev) => prev.map((t) => (t.id === id ? movementType : t)));
      return movementType;
    },
    [movementTypeRepo],
  );

  const activateMovementType = useCallback(
    async (id: string) => {
      const movementType = await movementTypeRepo.setActive(id);
      setMovementTypes((prev) => prev.map((t) => (t.id === id ? movementType : t)));
      return movementType;
    },
    [movementTypeRepo],
  );

  const deactivateMovementType = useCallback(
    async (id: string) => {
      const movementType = await movementTypeRepo.setInactive(id);
      setMovementTypes((prev) => prev.map((t) => (t.id === id ? movementType : t)));
      return movementType;
    },
    [movementTypeRepo],
  );

  return {
    movementTypes,
    isLoading,
    error,
    fetchMovementTypes,
    getMovementType,
    createMovementType,
    updateMovementType,
    activateMovementType,
    deactivateMovementType,
  };
}
