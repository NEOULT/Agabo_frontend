/** Clave del refresh token en localStorage. El access token vive solo en memoria. */
const REFRESH_KEY = 'agabo.refresh_token';

export const tokenStorage = {
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_KEY, token);
    } catch {
      // localStorage no disponible (modo privado): la sesión no persiste entre recargas.
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Ignorar: no hay nada que limpiar si no se pudo escribir.
    }
  },
};
