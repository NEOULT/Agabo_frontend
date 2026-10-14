import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Unit, CreateUnitDTO, UpdateUnitDTO } from '@/domain/models';
import type { UnitQueryParams } from '@/domain/repositories';

/** Unidades de medida (catalog.unit) con estado local por página. */
export function useUnits() {
  const { units: unitRepo } = useRepositories();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async (params?: UnitQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await unitRepo.getAll(params);
      setUnits(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar unidades');
    } finally {
      setIsLoading(false);
    }
  }, [unitRepo]);

  const getUnit = useCallback(async (id: string) => {
    return unitRepo.getById(id);
  }, [unitRepo]);

  const createUnit = useCallback(async (data: CreateUnitDTO) => {
    const unit = await unitRepo.create(data);
    setUnits((prev) => [...prev, unit]);
    return unit;
  }, [unitRepo]);

  const updateUnit = useCallback(async (id: string, data: UpdateUnitDTO) => {
    const unit = await unitRepo.update(id, data);
    setUnits((prev) => prev.map((u) => (u.id === id ? unit : u)));
    return unit;
  }, [unitRepo]);

  const activateUnit = useCallback(async (id: string) => {
    const unit = await unitRepo.setActive(id);
    setUnits((prev) => prev.map((u) => (u.id === id ? unit : u)));
    return unit;
  }, [unitRepo]);

  const deactivateUnit = useCallback(async (id: string) => {
    const unit = await unitRepo.setInactive(id);
    setUnits((prev) => prev.map((u) => (u.id === id ? unit : u)));
    return unit;
  }, [unitRepo]);

  return {
    units,
    isLoading,
    error,
    fetchUnits,
    getUnit,
    createUnit,
    updateUnit,
    activateUnit,
    deactivateUnit,
  };
}
