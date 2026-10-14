import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { SecurityUser, CreateUserDTO, UpdateUserDTO } from '@/domain/models';
import type { UserQueryParams } from '@/domain/repositories';

/**
 * Identidades de la empresa (security.user).
 *
 * El estado vive en el hook (igual que sucursales o proveedores): cada página
 * filtra por estado y búsqueda según lo que esté viendo. Los usuarios no se
 * eliminan: se activan/desactivan.
 */
export function useUsers() {
  const { users: userRepo } = useRepositories();
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params?: UserQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await userRepo.getAll(params);
      setUsers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [userRepo]);

  const getUser = useCallback(async (id: string) => {
    return userRepo.getById(id);
  }, [userRepo]);

  const createUser = useCallback(async (data: CreateUserDTO) => {
    const user = await userRepo.create(data);
    setUsers((prev) => [...prev, user]);
    return user;
  }, [userRepo]);

  const updateUser = useCallback(async (id: string, data: UpdateUserDTO) => {
    const user = await userRepo.update(id, data);
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
    return user;
  }, [userRepo]);

  const activateUser = useCallback(async (id: string) => {
    const user = await userRepo.setActive(id, true);
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
    return user;
  }, [userRepo]);

  const deactivateUser = useCallback(async (id: string) => {
    const user = await userRepo.setActive(id, false);
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
    return user;
  }, [userRepo]);

  const resetUserPassword = useCallback(async (id: string, password: string) => {
    const user = await userRepo.resetPassword(id, password);
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
    return user;
  }, [userRepo]);

  const assignProfiles = useCallback(async (id: string, profileIds: string[]) => {
    const user = await userRepo.replaceProfiles(id, profileIds);
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
    return user;
  }, [userRepo]);

  const assignBranches = useCallback(async (id: string, branchIds: string[]) => {
    const user = await userRepo.replaceBranches(id, branchIds);
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
    return user;
  }, [userRepo]);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    resetUserPassword,
    assignProfiles,
    assignBranches,
  };
}
