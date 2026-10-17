import React from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * Motor de escaneo por cámara (ZXing), reutilizable.
 *
 * Lo comparten la PC (lector del mostrador) y el teléfono (escaneo en cadena):
 * la diferencia es `continuous`, no la implementación. Usa ZXing en JS puro
 * (`@zxing/browser`): sin WASM ni CDN, funciona sin red.
 *
 * Requiere contexto seguro (HTTPS o `localhost`): en `http://` sobre la red
 * local el navegador no entrega la cámara y se avisa con un mensaje útil.
 *
 * Una sola sesión de cámara por montaje: `BrowserCodeReader.stop()` limpia el
 * `<video>` compartido (`srcObject = null`), así que dos lectores simultáneos
 * dejarían la pantalla negra. Además, el apagado se difiere un tick para
 * sobrevivir al doble montaje de `<StrictMode>` en desarrollo.
 */

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

/** Traduce los errores de cámara más comunes a un mensaje útil para quien escanea. */
export function describeCameraError(error: unknown): string {
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

interface UseBarcodeScannerOptions {
  /** Con `false` la cámara se apaga; con `true` se abre sobre `videoRef`. */
  enabled: boolean;
  /** Modo continuo: no se detiene al primer código (el teléfono escanea en cadena). */
  continuous?: boolean;
  /** Ventana en la que se ignora el mismo código repetido (solo en continuo). */
  dedupeMs?: number;
  /** Se llama con el texto de cada código detectado. */
  onDetected: (code: string) => void;
}

/**
 * Abre la cámara sobre el `<video>` devuelto y entrega cada código detectado.
 * Devuelve el `ref` del video, el estado de arranque y el error, si lo hay.
 */
export function useBarcodeScanner({
  enabled,
  continuous = false,
  dedupeMs = 1500,
  onDetected,
}: UseBarcodeScannerOptions) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const startingRef = React.useRef(false);
  const stopTimerRef = React.useRef<number | null>(null);
  const detectedRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const onDetectedRef = React.useRef(onDetected);
  const continuousRef = React.useRef(continuous);
  const dedupeMsRef = React.useRef(dedupeMs);
  const lastCodeRef = React.useRef<{ code: string; at: number } | null>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [isStarting, setIsStarting] = React.useState(enabled);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mantiene las opciones al día sin reiniciar la cámara en cada render
  React.useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  React.useEffect(() => {
    continuousRef.current = continuous;
    dedupeMsRef.current = dedupeMs;
  }, [continuous, dedupeMs]);

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
    lastCodeRef.current = null;
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
        if (!result) return;
        const text = result.getText();

        // Modo una sola lectura: el primer código detiene el lector.
        if (!continuousRef.current) {
          if (detectedRef.current) return;
          detectedRef.current = true;
          controlsRef.current?.stop();
          controlsRef.current = null;
          startingRef.current = false;
          onDetectedRef.current(text);
          return;
        }

        // Modo continuo: se ignora el mismo código repetido en la ventana de dedupe.
        const now = Date.now();
        const last = lastCodeRef.current;
        if (last && last.code === text && now - last.at < dedupeMsRef.current) return;
        lastCodeRef.current = { code: text, at: now };
        onDetectedRef.current(text);
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
    if (!enabled) return;

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
  }, [enabled, startScan, stopScan]);

  return { videoRef, error, isStarting, restart: startScan };
}
