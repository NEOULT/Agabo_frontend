import React from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera } from 'lucide-react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se llama una sola vez con el texto del primer código detectado. */
  onDetected: (code: string) => void;
}

/**
 * Formatos de código de barras que lee la caja: 1D del comercio (EAN/UPC/Code)
 * más QR. Acotar los formatos acelera el escaneo y evita falsos positivos.
 */
const SCAN_HINTS = new Map<DecodeHintType, unknown>();
SCAN_HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]);
SCAN_HINTS.set(DecodeHintType.TRY_HARDER, true);

/** Traduce los errores de cámara más comunes a un mensaje útil para el cajero. */
function describeCameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Permiso de cámara denegado. Habilítalo en el navegador o escribe el código a mano.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No se encontró ninguna cámara en este dispositivo. Escribe el código a mano.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
    default:
      return 'No se pudo abrir la cámara. Escribe el código a mano o revisa los permisos.';
  }
}

/**
 * Escáner de códigos de barras por cámara (trasera del móvil o webcam).
 *
 * Usa ZXing (`@zxing/browser`, JS puro: sin WASM ni CDN, funciona sin red).
 * Requiere un contexto seguro (HTTPS o `localhost`): en `http://` sobre la red
 * local el navegador no entrega la cámara y se avisa al cajero.
 *
 * Una sola sesión de cámara por apertura: `BrowserCodeReader.stop()` limpia el
 * `<video>` compartido (`srcObject = null`), así que dos lectores simultáneos
 * dejarían la pantalla negra. Además, el apagado se difiere un tick para
 * sobrevivir al doble montaje de `<StrictMode>` en desarrollo, que reejecuta el
 * efecto sin desmontar el componente.
 */
export function BarcodeScannerModal({ isOpen, onClose, onDetected }: BarcodeScannerModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const startingRef = React.useRef(false);
  const stopTimerRef = React.useRef<number | null>(null);
  const detectedRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const onDetectedRef = React.useRef(onDetected);

  const [error, setError] = React.useState<string | null>(null);
  const [isStarting, setIsStarting] = React.useState(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mantiene el callback al día sin reiniciar la cámara en cada render
  React.useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stopScan = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    startingRef.current = false;
  }, []);

  const startScan = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Si ya hay una sesión en marcha, no se abre otra sobre el mismo <video>.
    if (startingRef.current || controlsRef.current) return;

    detectedRef.current = false;
    setError(null);
    setIsStarting(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setIsStarting(false);
      setError(
        'Este navegador no permite la cámara, o la página no está en HTTPS. Escribe el código a mano.',
      );
      return;
    }

    startingRef.current = true;
    const reader = new BrowserMultiFormatReader(SCAN_HINTS, {
      delayBetweenScanAttempts: 150,
      tryPlayVideoTimeout: 10000,
    });

    // Si la cámara no arranca por otra razón, no se deja el spinner eterno:
    // se avisa con una acción concreta.
    const watchdog = window.setTimeout(() => {
      if (!startingRef.current) return;
      startingRef.current = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (!mountedRef.current) return;
      setIsStarting(false);
      setError(
        'La cámara tardó demasiado en responder. Cierra y vuelve a intentarlo, o escribe el código a mano.',
      );
    }, 15000);

    reader
      .decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video, (result) => {
        if (!result || detectedRef.current) return;
        detectedRef.current = true;
        controlsRef.current?.stop();
        controlsRef.current = null;
        startingRef.current = false;
        onDetectedRef.current(result.getText());
      })
      .then((controls) => {
        window.clearTimeout(watchdog);
        // Si se cerró mientras la cámara arrancaba, se apaga de inmediato.
        if (!startingRef.current || !mountedRef.current) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setIsStarting(false);
      })
      .catch((err) => {
        window.clearTimeout(watchdog);
        startingRef.current = false;
        if (!mountedRef.current) return;
        setIsStarting(false);
        setError(describeCameraError(err));
      });
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    // Un re-montaje inmediato (StrictMode) cancela el apagado diferido y
    // reutiliza la misma cámara: nunca quedan dos lectores sobre el <video>.
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    startScan();

    return () => {
      stopTimerRef.current = window.setTimeout(() => {
        stopTimerRef.current = null;
        stopScan();
      }, 0);
    };
  }, [isOpen, startScan, stopScan]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Escanear código de barras"
      subtitle="Apunta la cámara al código del producto. Se agrega solo al detectarlo."
      icon={<Camera className="h-5 w-5" />}
      size="lg"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      }
    >
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline autoPlay />

        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Marco de guía + línea de barrido */}
            <div className="relative h-32 w-4/5 max-w-sm rounded-lg border-2 border-white/70">
              <span className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-semantic-danger-500" />
            </div>
          </div>
        )}

        {isStarting && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <LoadingSpinner label="Abriendo la cámara..." />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          {error}
        </div>
      )}

      <p className="mt-3 text-xs text-text-tertiary">
        Consejo: en el móvil funciona mejor con buena luz. Si el código no se lee, ciérralo y
        escríbelo en el buscador.
      </p>
    </Modal>
  );
}
