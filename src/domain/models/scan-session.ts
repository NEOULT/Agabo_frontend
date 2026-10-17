/**
 * Sesión de escaneo por teléfono (POS).
 *
 * La PC abre la sesión y dibuja un QR con `scan_token`; el teléfono lo escanea,
 * lee códigos con su cámara y los publica en esa sesión mientras la PC los
 * sondea. Es efímera: vive minutos y muere al cerrarla o al expirar.
 */
export interface ScanSession {
  /** Credencial del teléfono; viaja dentro de la URL del QR. */
  token: string;
  /** Momento en que la sesión deja de aceptar códigos (ISO 8601). */
  expires_at: string;
}

/** Un código escaneado en el teléfono dentro de una sesión. */
export interface ScannedCode {
  /** Cursor incremental dentro de la sesión: la PC sondea con el último id. */
  id: number;
  code: string;
  scanned_at: string;
}

/** Lote de códigos nuevos devuelto a la PC al sondear. */
export interface ScannedCodeBatch {
  items: ScannedCode[];
  /** Último id entregado (o el cursor de entrada si no hubo novedades). */
  last_id: number;
  expires_at: string;
}
