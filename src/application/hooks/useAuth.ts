import { useCallback, useEffect } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import { useAuthStore } from '@/application/stores/useAuthStore';
import type { AuthCredentials } from '@/domain/models';

export function useAuth() {
  const { auth: authRepo } = useRepositories();

  // Selectores individuales: solo re-renderizan cuando el valor específico cambia
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  const login = useCallback(async (credentials: AuthCredentials) => {
    useAuthStore.getState().setLoading(true);
    try {
      const session = await authRepo.login(credentials);
      useAuthStore.getState().setSession(session);
      useAuthStore.getState().setUser(session.user);
      return session.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      useAuthStore.getState().clearSession();
      throw new Error(message);
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }, [authRepo]);

  /**
   * Login con Google: recibe el ID token (credential) que entrega Google
   * Identity Services y lo envía tal cual al backend.
   */
  const loginWithGoogle = useCallback(async (googleCredential: string) => {
    useAuthStore.getState().setLoading(true);
    try {
      const session = await authRepo.loginWithGoogle(googleCredential);
      useAuthStore.getState().setSession(session);
      useAuthStore.getState().setUser(session.user);
      return session.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Google';
      useAuthStore.getState().clearSession();
      throw new Error(message);
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }, [authRepo]);

  const logout = useCallback(async () => {
    try {
      await authRepo.logout();
    } finally {
      useAuthStore.getState().clearSession();
    }
  }, [authRepo]);

  /**
   * Cambia la contraseña del usuario. El backend revoca todas las sesiones
   * (RN-SEC-019), así que en éxito también se limpia la sesión local y la UI
   * debe redirigir al login para volver a autenticarse.
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    useAuthStore.getState().setLoading(true);
    try {
      await authRepo.changePassword(currentPassword, newPassword);
      useAuthStore.getState().clearSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar la contraseña';
      throw new Error(message);
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }, [authRepo]);

  const checkSession = useCallback(async () => {
    useAuthStore.getState().setLoading(true);
    try {
      const session = await authRepo.getSession();
      if (session) {
        useAuthStore.getState().setSession(session);
        useAuthStore.getState().setUser(session.user);
      } else {
        useAuthStore.getState().clearSession();
      }
    } catch {
      useAuthStore.getState().clearSession();
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  }, [authRepo]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    changePassword,
    checkSession,
  };
}
