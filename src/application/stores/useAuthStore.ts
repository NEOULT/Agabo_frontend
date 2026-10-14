import { create } from 'zustand';
import type { User, AuthSession, PermissionMap } from '@/domain/models';

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  /**
   * Permisos efectivos de la sesión (`modules → recurso → [acciones]`). La
   * interfaz autoriza con claves `<módulo>.<recurso>:<acción>`, equivalentes a
   * las que valida el backend (RF-SEC-021).
   */
  permissions: PermissionMap;
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
  permissions: { modules: {} },
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  // Los permisos viajan en la sesión: no hay que pedirlos por separado.
  setSession: (session) =>
    set({
      session,
      permissions: session?.permissions ?? { modules: {} },
      isAuthenticated: !!session,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () =>
    set({
      user: null,
      session: null,
      permissions: { modules: {} },
      isAuthenticated: false,
    }),
}));
