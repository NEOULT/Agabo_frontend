import { useCallback, useEffect } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { setActiveBranchHeader } from '@/infrastructure/api/client';
import type { CreateBranchDTO, UpdateBranchDTO } from '@/domain/models';

interface FetchBranchesParams {
  /** Búsqueda por nombre o código. */
  search?: string;
  /** Filtra por estado; sin valor lista todas (la lista de gestión necesita ver inactivas). */
  isActive?: boolean;
}

export function useBranches() {
  const { branches: branchRepo } = useRepositories();

  // Selectores individuales para evitar re-renders innecesarios
  const branches = useBranchStore((state) => state.branches);
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const isLoading = useBranchStore((state) => state.isLoading);
  const error = useBranchStore((state) => state.error);

  const fetchBranches = useCallback(async (params?: FetchBranchesParams) => {
    useBranchStore.getState().setLoading(true);
    useBranchStore.getState().setError(null);
    try {
      const result = await branchRepo.getAll(params);
      useBranchStore.getState().setBranches(result.data);

      // Si no hay sede activa, seleccionar la primera ACTIVA automáticamente
      const currentActive = useBranchStore.getState().activeBranch;
      if (!currentActive) {
        const firstActive = result.data.find((b) => b.is_active) ?? null;
        useBranchStore.getState().setActiveBranch(firstActive);
        setActiveBranchHeader(firstActive?.id ?? null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar sedes';
      useBranchStore.getState().setError(message);
    } finally {
      useBranchStore.getState().setLoading(false);
    }
  }, [branchRepo]);

  const getBranch = useCallback(async (id: string) => {
    return branchRepo.getById(id);
  }, [branchRepo]);

  const createBranch = useCallback(async (data: CreateBranchDTO) => {
    const branch = await branchRepo.create(data);
    const currentBranches = useBranchStore.getState().branches;
    useBranchStore.getState().setBranches([...currentBranches, branch]);
    return branch;
  }, [branchRepo]);

  const updateBranch = useCallback(async (id: string, data: UpdateBranchDTO) => {
    const branch = await branchRepo.update(id, data);
    const current = useBranchStore.getState();
    useBranchStore.getState().setBranches(
      current.branches.map((b) => (b.id === id ? branch : b)),
    );
    if (current.activeBranch?.id === id) {
      useBranchStore.getState().setActiveBranch(branch);
    }
    return branch;
  }, [branchRepo]);

  /** Desactiva una sucursal (no la elimina) y la retira de la lista operativa. */
  const deactivateBranch = useCallback(async (id: string) => {
    const branch = await branchRepo.setInactive(id);
    const current = useBranchStore.getState();
    const updatedBranches = current.branches.filter((b) => b.id !== id);
    useBranchStore.getState().setBranches(updatedBranches);

    // Si la sucursal desactivada era la activa, se cambia a la primera disponible
    if (current.activeBranch?.id === id) {
      const nextActive = updatedBranches[0] ?? null;
      useBranchStore.getState().setActiveBranch(nextActive);
      setActiveBranchHeader(nextActive?.id ?? null);
    }

    return branch;
  }, [branchRepo]);

  const activateBranch = useCallback(async (id: string) => {
    const branch = await branchRepo.setActive(id);
    // Se recarga la lista para reflejar el límite de cuota del backend
    await fetchBranches();
    return branch;
  }, [branchRepo, fetchBranches]);

  const setActiveBranch = useCallback((branch: import('@/domain/models').Branch) => {
    useBranchStore.getState().setActiveBranch(branch);
    // El backend acota el alcance por la sucursal activa (cabecera X-Branch-Uuid)
    setActiveBranchHeader(branch.id);
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return {
    branches,
    activeBranch,
    isLoading,
    error,
    fetchBranches,
    getBranch,
    createBranch,
    updateBranch,
    activateBranch,
    deactivateBranch,
    setActiveBranch,
  };
}
