import { create } from 'zustand';
import type { Branch } from '@/domain/models';

interface BranchState {
  branches: Branch[];
  activeBranch: Branch | null;
  isLoading: boolean;
  error: string | null;

  setBranches: (branches: Branch[]) => void;
  setActiveBranch: (branch: Branch | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBranchStore = create<BranchState>((set) => ({
  branches: [],
  activeBranch: null,
  isLoading: false,
  error: null,

  setBranches: (branches) => set({ branches }),
  setActiveBranch: (activeBranch) => set({ activeBranch }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
