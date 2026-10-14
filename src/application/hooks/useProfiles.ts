import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Profile, CreateProfileDTO, UpdateProfileDTO } from '@/domain/models';
import type { ProfileQueryParams } from '@/domain/repositories';

/**
 * Perfiles de la empresa (security.profile).
 *
 * Los perfiles agrupan permisos y se asignan a los usuarios. No se eliminan:
 * se activan/desactivan. El perfil de sistema está protegido por el backend.
 */
export function useProfiles() {
  const { profiles: profileRepo } = useRepositories();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async (params?: ProfileQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await profileRepo.getAll(params);
      setProfiles(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar perfiles');
    } finally {
      setIsLoading(false);
    }
  }, [profileRepo]);

  const getProfile = useCallback(async (id: string) => {
    return profileRepo.getById(id);
  }, [profileRepo]);

  const createProfile = useCallback(async (data: CreateProfileDTO) => {
    const profile = await profileRepo.create(data);
    setProfiles((prev) => [...prev, profile]);
    return profile;
  }, [profileRepo]);

  const updateProfile = useCallback(async (id: string, data: UpdateProfileDTO) => {
    const profile = await profileRepo.update(id, data);
    setProfiles((prev) => prev.map((p) => (p.id === id ? profile : p)));
    return profile;
  }, [profileRepo]);

  const activateProfile = useCallback(async (id: string) => {
    const profile = await profileRepo.setActive(id, true);
    setProfiles((prev) => prev.map((p) => (p.id === id ? profile : p)));
    return profile;
  }, [profileRepo]);

  const deactivateProfile = useCallback(async (id: string) => {
    const profile = await profileRepo.setActive(id, false);
    setProfiles((prev) => prev.map((p) => (p.id === id ? profile : p)));
    return profile;
  }, [profileRepo]);

  const assignPermissions = useCallback(async (id: string, permissionIds: string[]) => {
    const profile = await profileRepo.replacePermissions(id, permissionIds);
    setProfiles((prev) => prev.map((p) => (p.id === id ? profile : p)));
    return profile;
  }, [profileRepo]);

  return {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    getProfile,
    createProfile,
    updateProfile,
    activateProfile,
    deactivateProfile,
    assignPermissions,
  };
}
