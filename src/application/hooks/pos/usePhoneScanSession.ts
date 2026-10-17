import React from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { ScanSession } from '@/domain/models';
import type { PhoneScanOutcome, PhoneScannedItem } from './pos.types';

/** Ritmo del sondeo: un segundo, solo mientras la sesión está viva. */
const POLL_INTERVAL_MS = 2000;

interface UsePhoneScanSessionOptions {
  /** Con `true` se abre la sesión; al pasar a `false` se cierra y se deja de sondear. */
  enabled: boolean;
  /**
   * Se llama con cada código nuevo, en orden de escaneo, y debe devolver el
   * producto resuelto (o `null`) para que el modal lo muestre con su nombre.
   */
  onCode: (code: string) => PhoneScanOutcome;
}

/** ¿El error de la API tiene este código HTTP? (sin acoplarse a la capa de red). */
function hasStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && (error as { status?: number }).status === status;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo conectar con el servidor.';
}

/**
 * Sesión de escaneo por teléfono vista desde la PC.
 *
 * Abre la sesión al montar, sondea los códigos nuevos cada segundo mientras
 * sigue viva y la cierra al desmontar. El sondeo se detiene solo si el backend
 * responde 404 (sesión vencida o cerrada), para no gastar peticiones en balde.
 */
export function usePhoneScanSession({ enabled, onCode }: UsePhoneScanSessionOptions) {
  const { scanSessions } = useRepositories();

  const [session, setSession] = React.useState<ScanSession | null>(null);
  const [codes, setCodes] = React.useState<PhoneScannedItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isExpired, setIsExpired] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const onCodeRef = React.useRef(onCode);
  const sessionRef = React.useRef<ScanSession | null>(null);
  const lastIdRef = React.useRef(0);
  const inFlightRef = React.useRef(false);

  React.useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  React.useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let created: ScanSession | null = null;
    let pollTimer: number | null = null;

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const poll = async () => {
      const current = sessionRef.current;
      if (!current || inFlightRef.current) return;

      inFlightRef.current = true;

      try {
        const batch = await scanSessions.readCodes(current.token, lastIdRef.current);
        if (cancelled) return;

        lastIdRef.current = batch.last_id;

        if (batch.items.length > 0) {
          // Cada código se resuelve contra el catálogo antes de pintarlo: el
          // modal muestra el nombre del producto (o "no encontrado"), y de paso
          // el propio callback agrega el producto al carrito.
          const resolved = batch.items.map((item) => ({
            id: item.id,
            code: item.code,
            productName: onCodeRef.current(item.code).productName,
          }));

          setCodes((prev) => [...prev, ...resolved]);
        }
      } catch (err) {
        if (cancelled) return;

        if (hasStatus(err, 404)) {
          setIsExpired(true);
          stopPolling();
          return;
        }

        setError(toMessage(err));
      } finally {
        inFlightRef.current = false;
      }
    };

    const start = async () => {
      setIsStarting(true);
      setError(null);
      setIsExpired(false);
      setCodes([]);
      lastIdRef.current = 0;

      try {
        const opened = await scanSessions.create();
        created = opened;

        if (cancelled) {
          void scanSessions.close(opened.token).catch(() => undefined);
          return;
        }

        sessionRef.current = opened;
        setSession(opened);
        setIsStarting(false);
        pollTimer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setIsStarting(false);
        setError(toMessage(err));
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopPolling();

      const current = sessionRef.current ?? created;
      sessionRef.current = null;
      if (current) void scanSessions.close(current.token).catch(() => undefined);
    };
  }, [enabled, reloadKey, scanSessions]);

  /** Genera un QR nuevo (sesión nueva) sin cerrar el modal. */
  const restart = React.useCallback(() => setReloadKey((key) => key + 1), []);

  return { session, codes, error, isStarting, isExpired, restart };
}
