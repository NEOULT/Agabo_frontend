import type { User, AuthCredentials, AuthSession } from '@/domain/models';

export interface IAuthRepository {
  login(credentials: AuthCredentials): Promise<AuthSession>;
  /** Envía el ID token de Google (credential) tal cual lo recibe el backend. */
  loginWithGoogle(googleCredential: string): Promise<AuthSession>;
  logout(): Promise<void>;
  /**
   * Cambia la contraseña del usuario autenticado (PATCH /api/auth/password).
   * El backend revoca todas las sesiones al cambiarla (RN-SEC-019): después
   * de un cambio exitoso hay que volver a iniciar sesión.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getSession(): Promise<AuthSession | null>;
}
