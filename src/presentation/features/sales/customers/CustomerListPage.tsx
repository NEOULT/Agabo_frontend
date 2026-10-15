import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserRound, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useCustomers } from '@/application/hooks/useCustomers';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import type { Customer } from '@/domain/models';

/**
 * Lista de clientes (sales.customer).
 *
 * Muestra todos (activos e inactivos) con búsqueda, edición y
 * activación/desactivación — los clientes nunca se eliminan.
 */
export function CustomerListPage() {
  const navigate = useNavigate();
  const { customers, isLoading, error, fetchCustomers, activateCustomer, deactivateCustomer } =
    useCustomers();

  const [search, setSearch] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; customer: Customer } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('sales.customers:create');
  const canUpdate = can('sales.customers:update');
  const canSetActive = can('sales.customers:deactivate');

  React.useEffect(() => {
    fetchCustomers({ search: search || undefined });
  }, [fetchCustomers, search]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateCustomer(pendingAction.customer.id);
        toast.success(`El cliente "${pendingAction.customer.name}" fue desactivado.`);
      } else {
        await activateCustomer(pendingAction.customer.id);
        toast.success(`El cliente "${pendingAction.customer.name}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (c) => <span className="font-medium text-text-primary">{c.name}</span>,
    },
    {
      key: 'tax_id',
      header: 'RIF / NIT',
      cell: (c) => <span className="text-text-secondary">{c.tax_id ?? '—'}</span>,
    },
    {
      key: 'email',
      header: 'Correo',
      cell: (c) => <span className="text-text-secondary">{c.email ?? '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Teléfono',
      cell: (c) => <span className="text-text-secondary">{c.phone ?? '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (c) => (
        <Badge variant={c.is_active ? 'success' : 'neutral'}>
          {c.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canUpdate && (
            <button
              onClick={() => navigate(`/sales/customers/${c.id}/edit`)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar cliente"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({ type: c.is_active ? 'deactivate' : 'activate', customer: c })
              }
              className={`p-2 rounded-lg transition-colors ${
                c.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={c.is_active ? 'Desactivar cliente' : 'Activar cliente'}
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
        <CardTitle>Clientes</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/sales/customers/new')}
          >
            Nuevo Cliente
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
          data={customers}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<UserRound className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay clientes'}
              description={
                search
                  ? 'No se encontraron clientes que coincidan con la búsqueda.'
                  : 'Registra tu primer cliente para poder asociarlo a las ventas.'
              }
              action={
                !search && canCreate ? (
                  <Button onClick={() => navigate('/sales/customers/new')}>
                    + Nuevo Cliente
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
        title={pendingAction?.type === 'deactivate' ? 'Desactivar cliente' : 'Activar cliente'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.customer.name}"? No podrá usarse en ventas nuevas, pero se conserva su historial.`
            : `¿Activar "${pendingAction?.customer.name}"? Volverá a estar disponible para operar.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
