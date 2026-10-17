import React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ScanLine, Volume2, VolumeX, XCircle } from 'lucide-react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import { useBarcodeScanner } from '@/application/hooks/pos/useBarcodeScanner';
import {
  playScanError,
  playScanSuccess,
  unlockScanAudio,
} from '@/infrastructure/scanning/scan-sound';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';

/** Ritmo con el que el teléfono comprueba que la sesión de la PC sigue viva. */
const STATUS_INTERVAL_MS = 3000;

/** Vibración de respaldo: iOS no la soporta, por eso el aviso principal es el sonido. */
const SCAN_VIBRATION_MS = 80;

type Phase = 'connecting' | 'ready' | 'scanning' | 'finished' | 'error';

interface ScannedItem {
  key: string;
  code: string;
  ok: boolean;
}

/** ¿El error de la API tiene este código HTTP? (sin acoplarse a la capa de red). */
function hasStatus(error: unknown, status: number): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { status?: number }).status === status
  );
}

/**
 * Escaneo por teléfono (lado móvil).
 *
 * Página pública: la sesión viene en la URL (`/scan/:token`) y ese token es la
 * única credencial, así que no hay login. Escanea en cadena con la cámara y
 * publica cada código en la sesión que la PC está sondeando. Cuando la PC cierra
 * el QR, la página se marca como terminada y apaga la cámara.
 *
 * El escaneo arranca con un toque a propósito: el cajero trabaja mirando el
 * producto, así que cada lectura se confirma con el "twick" de caja —y los
 * navegadores solo permiten sonar (y abrir la cámara) tras un gesto real.
 */
export function PhoneScanPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { scanSessions } = useRepositories();

  const [phase, setPhase] = React.useState<Phase>('connecting');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [scanned, setScanned] = React.useState<ScannedItem[]>([]);
  const [feedback, setFeedback] = React.useState<{ code: string; ok: boolean } | null>(null);
  const [flashKey, setFlashKey] = React.useState(0);
  const [soundOn, setSoundOn] = React.useState(true);

  // Valida el token al abrir y luego vigila que la sesión siga viva en la PC.
  React.useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const check = async () => {
      try {
        await scanSessions.getStatus(token);
        if (cancelled) return;
        // No se retrocede un escaneo en marcha ni se tapa un error de red.
        setPhase((current) =>
          current === 'error' || current === 'scanning' ? current : 'ready',
        );
      } catch (err) {
        if (cancelled) return;

        // 404 = sesión cerrada o vencida; 400 = token con formato inválido.
        if (hasStatus(err, 404) || hasStatus(err, 400)) {
          setPhase('finished');
          stop();
          return;
        }

        setErrorMessage(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
        setPhase('error');
        stop();
      }
    };

    void check();
    timer = window.setInterval(() => void check(), STATUS_INTERVAL_MS);

    return () => {
      cancelled = true;
      stop();
    };
  }, [scanSessions, token]);

  /** Arranca el escaneo. El toque desbloquea el audio y habilita la cámara. */
  const startScanning = () => {
    void unlockScanAudio();
    setPhase('scanning');
  };

  const handleDetected = React.useCallback(
    async (code: string) => {
      const normalized = code.trim();
      if (!normalized) return;

      try {
        const entry = await scanSessions.appendCode(token, normalized);
        setScanned((prev) => [{ key: `ok-${entry.id}`, code: entry.code, ok: true }, ...prev]);
        setFeedback({ code: entry.code, ok: true });
        if (soundOn) playScanSuccess();
        navigator.vibrate?.(SCAN_VIBRATION_MS);
      } catch (err) {
        if (hasStatus(err, 404)) {
          setPhase('finished');
          return;
        }

        setScanned((prev) => [{ key: `err-${Date.now()}`, code: normalized, ok: false }, ...prev]);
        setFeedback({ code: normalized, ok: false });
        if (soundOn) playScanError();
      }
    },
    [scanSessions, soundOn, token],
  );

  const { videoRef, error: cameraError, isStarting } = useBarcodeScanner({
    enabled: phase === 'scanning',
    continuous: true,
    onDetected: (code) => {
      void handleDetected(code);
      setFlashKey((key) => key + 1);
    },
  });

  const okCount = scanned.filter((item) => item.ok).length;

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Cabecera */}
      <header className="flex items-center gap-2 px-4 py-3">
        <ScanLine className="h-5 w-5 flex-shrink-0 text-brand-400" />
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold">Escaneo por teléfono</h1>
          <p className="truncate text-xs text-white/60">
            {phase === 'scanning'
              ? 'Apunta la cámara al código de barras.'
              : 'Confirma cada lectura con el sonido de la caja.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSoundOn((current) => !current)}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Silenciar el aviso de escaneo' : 'Activar el aviso de escaneo'}
          className="flex-shrink-0 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </header>

      {/* Cámara */}
      <div className="relative flex-1 overflow-hidden">
        {phase === 'scanning' && (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {!cameraError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-40 w-4/5 max-w-sm rounded-xl border-2 border-white/70">
                  <span
                    key={flashKey}
                    className="absolute inset-0 rounded-xl ring-2 ring-semantic-success-400/0 transition"
                  />
                </div>
              </div>
            )}
            {isStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <LoadingSpinner label="Abriendo la cámara..." />
              </div>
            )}
          </>
        )}

        {phase === 'connecting' && (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner label="Conectando con la caja..." />
          </div>
        )}

        {phase === 'ready' && (
          <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
            <ScanLine className="h-12 w-12 text-brand-400" />
            <div>
              <p className="text-base font-semibold">Listo para escanear</p>
              <p className="mt-1 text-sm text-white/60">
                Activa la cámara y el sonido de la caja para empezar.
              </p>
            </div>
            <button
              type="button"
              onClick={startScanning}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Empezar a escanear
            </button>
          </div>
        )}

        {phase === 'finished' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-semantic-success-400" />
            <p className="text-base font-semibold">Escaneo terminado</p>
            <p className="text-sm text-white/60">
              La caja cerró la sesión. Ya puedes volver a la computadora.
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <XCircle className="h-12 w-12 text-semantic-danger-400" />
            <p className="text-base font-semibold">No se pudo conectar</p>
            <p className="text-sm text-white/60">{errorMessage}</p>
          </div>
        )}

        {cameraError && phase === 'scanning' && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg bg-semantic-warning-500/90 px-4 py-3 text-sm text-semantic-warning-950">
            {cameraError}
          </div>
        )}
      </div>

      {/* Últimos códigos */}
      {(scanned.length > 0 || feedback) && (
        <footer className="max-h-48 overflow-y-auto bg-white/5 px-4 py-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-xs text-white/60">
            <span>Escaneados</span>
            <span>{okCount}</span>
          </div>
          <ul className="space-y-1">
            {scanned.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm">
                {item.ok ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-semantic-success-400" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0 text-semantic-danger-400" />
                )}
                <span className="truncate font-mono">{item.code}</span>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </div>
  );
}
