import type { IScanSessionRepository } from '@/domain/repositories';
import type { ScanSession, ScannedCode, ScannedCodeBatch } from '@/domain/models';
import { api } from './client';
import { toApiError } from './errors';

/** Respuesta del backend para una sesión (snake_case de la API). */
interface ApiScanSession {
  scan_token: string;
  expires_at_tsz: string;
}

/** Respuesta del backend para un código escaneado. */
interface ApiScannedCode {
  id: number;
  code: string;
  scanned_at_tsz: string;
}

/** Respuesta del backend al sondear códigos nuevos. */
interface ApiScannedCodeBatch {
  items: ApiScannedCode[];
  last_id: number;
  expires_at_tsz: string;
}

function toSession(data: ApiScanSession): ScanSession {
  return { token: data.scan_token, expires_at: data.expires_at_tsz };
}

function toScannedCode(data: ApiScannedCode): ScannedCode {
  return { id: data.id, code: data.code, scanned_at: data.scanned_at_tsz };
}

/**
 * Implementación REST de las sesiones de escaneo por teléfono.
 *
 * La PC usa `create`/`readCodes`/`close` (endpoints con permiso); el teléfono
 * usa `getStatus`/`appendCode`, que son públicos: el `scan_token` de la URL es
 * la única credencial, así que no se necesita sesión de usuario en el móvil.
 */
export class ApiScanSessionRepository implements IScanSessionRepository {
  async create(): Promise<ScanSession> {
    try {
      const { data } = await api.post<ApiScanSession>('/pos/scan-sessions');
      return toSession(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async getStatus(token: string): Promise<ScanSession> {
    try {
      const { data } = await api.get<ApiScanSession>(`/pos/scan-sessions/${token}`);
      return toSession(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async readCodes(token: string, after: number): Promise<ScannedCodeBatch> {
    try {
      const { data } = await api.get<ApiScannedCodeBatch>(`/pos/scan-sessions/${token}/codes`, {
        params: { after },
      });

      return {
        items: data.items.map(toScannedCode),
        last_id: data.last_id,
        expires_at: data.expires_at_tsz,
      };
    } catch (error) {
      throw toApiError(error);
    }
  }

  async appendCode(token: string, code: string): Promise<ScannedCode> {
    try {
      const { data } = await api.post<ApiScannedCode>(`/pos/scan-sessions/${token}/codes`, {
        code,
      });
      return toScannedCode(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  async close(token: string): Promise<void> {
    try {
      await api.delete(`/pos/scan-sessions/${token}`);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
