import type { IAuthRepository } from '@/domain/repositories';
import type { User, AuthCredentials, AuthSession } from '@/domain/models';
import { api, setAccessToken, getAccessToken, ensureFreshSession } from './client';
import { tokenStorage } from './tokenStorage';
import { toAuthSession, toUser, type ApiPublicUser, type ApiProfileRef, type ApiLoginResponse } from './auth.mapper';

/**
 * Respuesta de GET /api/auth/me: los campos del usuario van en plano,
 * junto a profiles, branches y permissions.
 */
type ApiSessionResponse = ApiPublicUser & {
  profiles: ApiProfileRef[];
  branches: string[];
  permissions: Record<string, Record<string, string[]>>;
};

/**
 * Implementación REST del repositorio de auth contra el backend Express.
 *
 * Flujo de sesión:
 * - login/loginWithGoogle: el backend devuelve access + refresh; el access
 *   vive en memoria (client.ts) y el refresh en localStorage.
 * - getSession (al recargar la app): se refresca el access con el refresh
 *   guardado y se carga el usuario con GET /api/auth/me.
 * - logout: revoca la sesión en el backend y limpia el storage local.
 */
export class ApiAuthRepository implements IAuthRepository {
  async login(credentials: AuthCredentials): Promise<AuthSession> {
    try {
      const { data } = await api.post<ApiLoginResponse>('/auth/login', {
        user_identifier_text: credentials.identifier,
        user_password_text: credentials.password,
      });

      return this.persistSession(data);
    } catch (error) {
      throw this.normalize(error);
    }
  }

  async loginWithGoogle(googleCredential: string): Promise<AuthSession> {
    try {
      const { data } = await api.post<ApiLoginResponse>('/auth/login', {
        google_credential_text: googleCredential,
      });

      return this.persistSession(data);
    } catch (error) {
      throw this.normalize(error);
    }
  }

  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();

    try {
      if (refreshToken) {
        await api.post('/auth/logout', { session_refresh_text: refreshToken });
      }
    } catch {
      // Logout idempotente en el backend: aunque falle la llamada,
      // la sesión local se limpia igual.
    } finally {
      setAccessToken(null);
      tokenStorage.clear();
    }
  }

  /**
   * PATCH /api/auth/password. El backend revoca TODAS las sesiones del usuario
   * al cambiar la contraseña (RN-SEC-019), incluida la actual: por eso se
   * limpian los tokens locales aunque la operación sea exitosa.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.patch('/auth/password', {
        user_current_password_text: currentPassword,
        user_new_password_text: newPassword,
      });
    } catch (error) {
      throw this.normalize(error);
    } finally {
      setAccessToken(null);
      tokenStorage.clear();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user ?? null;
  }

  async getSession(): Promise<AuthSession | null> {
    if (!tokenStorage.getRefreshToken()) {
      return null;
    }

    const refreshed = await ensureFreshSession();
    if (!refreshed) {
      return null;
    }

    try {
      const { data } = await api.get<ApiSessionResponse>('/auth/me');
      const user = toUser(data, data.profiles, data.branches);

      return {
        user,
        access_token: getAccessToken() ?? '',
        refresh_token: tokenStorage.getRefreshToken() ?? '',
        expires_at: Date.now() + 5 * 60 * 1000,
      };
    } catch {
      return null;
    }
  }

  private persistSession(data: ApiLoginResponse): AuthSession {
    setAccessToken(data.access_token);
    tokenStorage.setRefreshToken(data.session_refresh_text);
    return toAuthSession(data);
  }

  /** El backend responde `{ error: { code, message, details } }`; se propaga el message. */
  private normalize(error: unknown): Error {
    if (error instanceof Error && 'response' in error) {
      const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
      const message = response?.data?.error?.message;
      if (message) {
        return new Error(message);
      }
    }
    return error instanceof Error ? error : new Error('Error de conexión con el servidor');
  }
}
