import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, CircleAlert, QrCode, RefreshCw, Smartphone } from 'lucide-react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { usePhoneScanSession } from '@/application/hooks/pos/usePhoneScanSession';
import type { PhoneScanOutcome } from '@/application/hooks/pos/pos.types';

interface PhoneScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Se llama por cada código escaneado en el teléfono. Agrega el producto al
   * carrito y devuelve su nombre (o `null`) para pintar la lista.
   */
  onDetected: (code: string) => PhoneScanOutcome;
}

/** ¿La app corre en localhost? Entonces el teléfono no podrá abrir el QR. */
function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/** Segundos restantes hasta `expiresAt`, nunca negativos. */
function secondsLeft(expiresAt: string, nowMs: number): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - nowMs) / 1000));
}

/**
 * Escaneo por teléfono desde la caja.
 *
 * La PC abre una sesión y dibuja un QR con su URL; el teléfono la abre, escanea
 * con su cámara y cada código vuelve aquí para agregarse al carrito por
 * `onDetected` (el mismo camino que el lector del mostrador).
 */
export function PhoneScanModal({ isOpen, onClose, onDetected }: PhoneScanModalProps) {
  const { session, codes, error, isStarting, isExpired, restart } = usePhoneScanSession({
    enabled: isOpen,
    onCode: onDetected,
  });

  // Reloj local para la cuenta atrás del QR (el sondeo no re-renderiza si no
  // llegan códigos).
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!isOpen) return;

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const scanUrl = session ? `${window.location.origin}/scan/${session.token}` : '';
  const remaining = session ? secondsLeft(session.expires_at, nowMs) : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Escanear con teléfono"
      subtitle="Abre el QR con la cámara del teléfono y escanea los productos desde ahí."
      icon={<Smartphone className="h-5 w-5" />}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={restart}
            disabled={isStarting}
          >
            Nuevo QR
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      {isStarting && (
        <div className="flex justify-center py-10">
          <LoadingSpinner label="Creando la sesión de escaneo..." />
        </div>
      )}

      {!isStarting && error && (
        <div className="rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          {error}
        </div>
      )}

      {!isStarting && !error && isExpired && (
        <div className="rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          El QR venció y la sesión se cerró. Genera uno nuevo para seguir escaneando.
        </div>
      )}

      {!isStarting && !error && !isExpired && session && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border border-border-default bg-white p-4">
              <QRCodeSVG value={scanUrl} size={200} level="M" />
            </div>
            <p className="text-center text-sm text-text-secondary">
              Escanea este código con la cámara del teléfono.
            </p>
            <p className="text-xs text-text-tertiary">
              El QR vence en {minutes}:{String(seconds).padStart(2, '0')} ·
              <span className="ml-1 inline-flex items-center gap-1">
                <QrCode className="h-3 w-3" />
                los códigos llegan solos
              </span>
            </p>
          </div>

          {isLocalhost() && (
            <div className="rounded-lg bg-surface-tertiary px-3 py-2 text-xs text-text-tertiary">
              Estás en <span className="font-medium">localhost</span>: el teléfono no puede abrir
              esta dirección. Publica la app con un túnel HTTPS (Dev Tunnel) y abre el QR desde esa
              URL.
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Recibidos</span>
              <span className="text-xs text-text-tertiary">{codes.length}</span>
            </div>

            {codes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-default px-4 py-6 text-center text-sm text-text-tertiary">
                Aún no llega ningún código.
              </p>
            ) : (
              <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto">
                {codes.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-lg bg-surface-secondary px-3 py-2"
                  >
                    {item.productName ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-semantic-success-600" />
                    ) : (
                      <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-semantic-warning-600" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        {item.productName ?? 'Producto no encontrado'}
                      </span>
                      <span className="block truncate font-mono text-xs text-text-tertiary">
                        {item.code}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
