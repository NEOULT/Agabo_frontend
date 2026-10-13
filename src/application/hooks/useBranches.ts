import { useCallback, useEffect } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import { useBranchStore } from '@/application/stores/useBranchStore';
import type { CreateBranchDTO, UpdateBranchDTO } from '@/domain/models';

export function useBranches() {
  const { branches: branchRepo } = useRepositories();

  // Selectores individuales para evitar re-renders innecesarios
  const branches = useBranchStore((state) => state.branches);
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const isLoading = useBranchStore((state) => state.isLoading);
  const error = useBranchStore((state) => state.error);

  const fetchBranches = useCallback(async () => {
    useBranchStore.getState().setLoading(true);
    useBranchStore.getState().setError(null);
    try {
      const result = await branchRepo.getAll();
      useBranchStore.getState().setBranches(result.data);

      // Si no hay sede activa, seleccionar la primera automáticamente
      const currentActive = useBranchStore.getState().activeBranch;
      if (!currentActive && result.data.length > 0) {
        useBranchStore.getState().setActiveBranch(result.data[0]);
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

  const deleteBranch = useCallback(async (id: string) => {
    await branchRepo.delete(id);
    const current = useBranchStore.getState();
    const updatedBranches = current.branches.filter((b) => b.id !== id);
    useBranchStore.getState().setBranches(updatedBranches);
    if (current.activeBranch?.id === id) {
      useBranchStore.getState().setActiveBranch(updatedBranches[0] ?? null);
    }
  }, [branchRepo]);

  const setActiveBranch = useCallback((branch: import('@/domain/models').Branch) => {
    useBranchStore.getState().setActiveBranch(branch);
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
    deleteBranch,
    setActiveBranch,
  };
}
