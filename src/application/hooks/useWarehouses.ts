import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Warehouse, CreateWarehouseDTO, UpdateWarehouseDTO } from '@/domain/models';
import type { WarehouseQueryParams } from '@/domain/repositories';

/**
 * Almacenes de una sucursal (company.warehouse).
 *
 * A diferencia de sucursales, los almacenes no son estado global: cada
 * página los gestiona con su propio filtro (sucursal, búsqueda, estado),
 * así que el estado vive en el hook.
 */
export function useWarehouses() {
  const { warehouses: warehouseRepo } = useRepositories();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async (params?: WarehouseQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await warehouseRepo.getAll(params);
      setWarehouses(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar almacenes');
    } finally {
      setIsLoading(false);
    }
  }, [warehouseRepo]);

  const getWarehouse = useCallback(async (id: string) => {
    return warehouseRepo.getById(id);
  }, [warehouseRepo]);

  const createWarehouse = useCallback(async (data: CreateWarehouseDTO) => {
    const warehouse = await warehouseRepo.create(data);
    setWarehouses((prev) => [...prev, warehouse]);
    return warehouse;
  }, [warehouseRepo]);

  const updateWarehouse = useCallback(async (id: string, data: UpdateWarehouseDTO) => {
    const warehouse = await warehouseRepo.update(id, data);
    setWarehouses((prev) => prev.map((w) => (w.id === id ? warehouse : w)));
    return warehouse;
  }, [warehouseRepo]);

  const activateWarehouse = useCallback(async (id: string) => {
    const warehouse = await warehouseRepo.setActive(id);
    setWarehouses((prev) => prev.map((w) => (w.id === id ? warehouse : w)));
    return warehouse;
  }, [warehouseRepo]);

  const deactivateWarehouse = useCallback(async (id: string) => {
    const warehouse = await warehouseRepo.setInactive(id);
    setWarehouses((prev) => prev.map((w) => (w.id === id ? warehouse : w)));
    return warehouse;
  }, [warehouseRepo]);

  return {
    warehouses,
    isLoading,
    error,
    fetchWarehouses,
    getWarehouse,
    createWarehouse,
    updateWarehouse,
    activateWarehouse,
    deactivateWarehouse,
  };
}
