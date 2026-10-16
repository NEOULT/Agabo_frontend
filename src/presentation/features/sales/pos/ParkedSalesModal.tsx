import { Clock, Trash2 } from 'lucide-react';
import { Modal } from '@/presentation/components/ui/Modal';
import { Button } from '@/presentation/components/ui/Button';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import type { ParkedSale } from '@/application/stores/useParkedSalesStore';

interface ParkedSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: ParkedSale[];
  /** Pinta un importe en la moneda de visualización del POS. */
  formatAmount: (value: number) => string;
  onResume: (sale: ParkedSale) => void;
  onRemove: (id: string) => void;
}

/** Tickets en espera del punto de venta: retomar o descartar. */
export function ParkedSalesModal({
  isOpen,
  onClose,
  sales,
  formatAmount,
  onResume,
  onRemove,
}: ParkedSalesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tickets en espera"
      subtitle="Retoma un ticket guardado para seguir cobrándolo."
      icon={<Clock className="h-5 w-5" />}
      size="lg"
    >
      {sales.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-10 w-10" />}
          title="No hay tickets en espera"
          description="Usa «Poner en espera» para guardar el carrito y atender a otro cliente."
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {sales.map((sale) => {
            const visibleLines = sale.lines.filter((line) => !line.is_hidden);
            const total = visibleLines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
            const units = visibleLines.reduce((sum, line) => sum + line.quantity, 0);

            return (
              <li key={sale.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{sale.label}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {units} unidad(es) ·{' '}
                    {new Date(sale.created_at).toLocaleString('es-CO')}
                  </p>
                </div>

                <span className="text-sm font-semibold text-text-primary">
                  {formatAmount(total)}
                </span>

                <Button size="sm" variant="secondary" onClick={() => onResume(sale)}>
                  Retomar
                </Button>

                <button
                  type="button"
                  onClick={() => onRemove(sale.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-tertiary hover:text-semantic-danger-600"
                  aria-label={`Eliminar ${sale.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
