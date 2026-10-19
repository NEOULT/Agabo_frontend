import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { usePaymentMethods } from '@/application/hooks/usePaymentMethods';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import type { PaymentMethod } from '@/domain/models';

/**
 * Lista de métodos de pago (sales.payment_method).
 *
 * Muestra todos (activos e inactivos) con búsqueda, edición y
 * activación/desactivación — los métodos nunca se eliminan. La comisión se
 * guarda como fracción de la venta y aquí se muestra en porcentaje.
 */
export function PaymentMethodListPage() {
  const navigate = useNavigate();
  const {
    paymentMethods,
    isLoading,
    error,
    fetchPaymentMethods,
    activatePaymentMethod,
    deactivatePaymentMethod,
  } = usePaymentMethods();

  const [search, setSearch] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; paymentMethod: PaymentMethod } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('sales.payment_methods:create');
  const canUpdate = can('sales.payment_methods:update');
  const canSetActive = can('sales.payment_methods:deactivate');

  React.useEffect(() => {
    fetchPaymentMethods({ search: search || undefined });
  }, [fetchPaymentMethods, search]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivatePaymentMethod(pendingAction.paymentMethod.id);
        toast.success(`El método "${pendingAction.paymentMethod.name}" fue desactivado.`);
      } else {
        await activatePaymentMethod(pendingAction.paymentMethod.id);
        toast.success(`El método "${pendingAction.paymentMethod.name}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<PaymentMethod>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (p) => <span className="font-medium text-text-primary">{p.name}</span>,
    },
    {
      key: 'commission_rate',
      header: 'Comisión',
      align: 'right',
      cell: (p) => (
        <span className="text-text-secondary">
          {p.commission_rate > 0
            ? `${(p.commission_rate * 100).toLocaleString('es', { maximumFractionDigits: 2 })} %`
            : '—'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (p) => (
        <Badge variant={p.is_active ? 'success' : 'neutral'}>
          {p.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canUpdate && (
            <button
              onClick={() => navigate(`/sales/payment-methods/${p.id}/edit`)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar método de pago"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({
                  type: p.is_active ? 'deactivate' : 'activate',
                  paymentMethod: p,
                })
              }
              className={`p-2 rounded-lg transition-colors ${
                p.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={p.is_active ? 'Desactivar método' : 'Activar método'}
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Métodos de pago</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/sales/payment-methods/new')}
          >
            Nuevo Método
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre..."
          />
        </div>

        <Table
          columns={columns}
          data={paymentMethods}
          rowKey={(p) => p.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay métodos de pago'}
              description={
                search
                  ? 'No se encontraron métodos que coincidan con la búsqueda.'
                  : 'Registra los métodos con los que tus clientes pagan las ventas.'
              }
              action={
                !search && canCreate ? (
                  <Button onClick={() => navigate('/sales/payment-methods/new')}>
                    + Nuevo Método
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={
          pendingAction?.type === 'deactivate'
            ? 'Desactivar método de pago'
            : 'Activar método de pago'
        }
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.paymentMethod.name}"? No podrá usarse en pagos nuevos, pero se conserva su historial.`
            : `¿Activar "${pendingAction?.paymentMethod.name}"? Volverá a estar disponible para operar.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
