import { create } from 'zustand';
import type { User, AuthSession } from '@/domain/models';

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSession: (session) => set({ session, isAuthenticated: !!session }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => set({ user: null, session: null, isAuthenticated: false }),
}));
