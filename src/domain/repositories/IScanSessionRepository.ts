import type { ScanSession, ScannedCode, ScannedCodeBatch } from '@/domain/models';

/**
 * Sesiones de escaneo por teléfono del punto de venta.
 *
 * `create`/`readCodes`/`close` los llama la PC autenticada; `getStatus` y
 * `appendCode` los llama el teléfono con el token público del QR.
 */
export interface IScanSessionRepository {
  create(): Promise<ScanSession>;
  getStatus(token: string): Promise<ScanSession>;
  readCodes(token: string, after: number): Promise<ScannedCodeBatch>;
  appendCode(token: string, code: string): Promise<ScannedCode>;
  close(token: string): Promise<void>;
}
