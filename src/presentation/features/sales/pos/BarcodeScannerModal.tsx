import { Camera } from 'lucide-react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useBarcodeScanner } from '@/application/hooks/pos/useBarcodeScanner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se llama una sola vez con el texto del primer código detectado. */
  onDetected: (code: string) => void;
}

/**
 * Escáner de códigos de barras por cámara del mostrador (webcam o móvil).
 *
 * El motor ZXing vive en `useBarcodeScanner`; aquí solo queda el marco de la
 * cámara y el mensaje de error. Lee un único código y cierra el lector: la PC
 * ya sabe agregar el producto con `onDetected`.
 */
export function BarcodeScannerModal({ isOpen, onClose, onDetected }: BarcodeScannerModalProps) {
  const { videoRef, error, isStarting } = useBarcodeScanner({
    enabled: isOpen,
    onDetected,
  });

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
