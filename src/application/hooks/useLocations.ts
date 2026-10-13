import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Location, CreateLocationDTO, UpdateLocationDTO } from '@/domain/models';
import type { LocationQueryParams } from '@/domain/repositories';

/**
 * Ubicaciones de un almacén (company.location).
 *
 * Igual que los almacenes, el estado vive en el hook: cada página filtra
 * por almacén, búsqueda y estado según lo que esté viendo el usuario.
 */
export function useLocations() {
  const { locations: locationRepo } = useRepositories();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async (params?: LocationQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await locationRepo.getAll(params);
      setLocations(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ubicaciones');
    } finally {
      setIsLoading(false);
    }
  }, [locationRepo]);

  const getLocation = useCallback(async (id: string) => {
    return locationRepo.getById(id);
  }, [locationRepo]);

  const createLocation = useCallback(async (data: CreateLocationDTO) => {
    const location = await locationRepo.create(data);
    setLocations((prev) => [...prev, location]);
    return location;
  }, [locationRepo]);

  const updateLocation = useCallback(async (id: string, data: UpdateLocationDTO) => {
    const location = await locationRepo.update(id, data);
    setLocations((prev) => prev.map((l) => (l.id === id ? location : l)));
    return location;
  }, [locationRepo]);

  const activateLocation = useCallback(async (id: string) => {
    const location = await locationRepo.setActive(id);
    setLocations((prev) => prev.map((l) => (l.id === id ? location : l)));
    return location;
  }, [locationRepo]);

  const deactivateLocation = useCallback(async (id: string) => {
    const location = await locationRepo.setInactive(id);
    setLocations((prev) => prev.map((l) => (l.id === id ? location : l)));
    return location;
  }, [locationRepo]);

  return {
    locations,
    isLoading,
    error,
    fetchLocations,
    getLocation,
    createLocation,
    updateLocation,
    activateLocation,
    deactivateLocation,
  };
}
