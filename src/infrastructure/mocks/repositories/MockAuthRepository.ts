import type { IAuthRepository } from '@/domain/repositories';
import type { AuthCredentials, AuthSession } from '@/domain/models';
import { MOCK_USERS } from '@/infrastructure/mocks/data';

/**
 * Repositorio mock del dominio: simula el contrato del backend Express
 * (identifier único y refresh token) sin depender de la red.
 */
export class MockAuthRepository implements IAuthRepository {
  private currentSession: AuthSession | null = null;

  async login(credentials: AuthCredentials) {
    await new Promise((r) => setTimeout(r, 500));

    const identifier = credentials.identifier.trim().toLowerCase();
    const user = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === identifier,
    );

    if (!user || !credentials.password) {
      throw new Error('Credenciales inválidas');
    }

    this.currentSession = {
      user,
      access_token: `mock-token-${user.id}-${Date.now()}`,
      refresh_token: `mock-refresh-${user.id}-${Date.now()}`,
      expires_at: Date.now() + 3600000, // 1 hora
      // El mock no reproduce el catálogo de permisos: la interfaz cae al
      // respaldo por rol cuando el mapa viene vacío.
      permissions: { modules: {} },
    };

    return this.currentSession;
  }

  async loginWithGoogle(): Promise<AuthSession> {
    await new Promise((r) => setTimeout(r, 500));
    throw new Error('Login con Google no disponible en modo mock');
  }

  async changePassword(): Promise<void> {
    await new Promise((r) => setTimeout(r, 300));
    this.currentSession = null;
  }

  async logout() {
    await new Promise((r) => setTimeout(r, 100));
    this.currentSession = null;
  }

  async getCurrentUser() {
    await new Promise((r) => setTimeout(r, 50));
    return this.currentSession?.user ?? null;
  }

  async getSession() {
    await new Promise((r) => setTimeout(r, 50));
    return this.currentSession;
  }
}
