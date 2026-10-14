import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Truck, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useSuppliers } from '@/application/hooks/useSuppliers';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import type { Supplier } from '@/domain/models';

/**
 * Lista de proveedores (purchases.supplier).
 *
 * Muestra todos (activos e inactivos) con búsqueda, edición y
 * activación/desactivación — los proveedores nunca se eliminan.
 */
export function SupplierListPage() {
  const navigate = useNavigate();
  const { suppliers, isLoading, error, fetchSuppliers, activateSupplier, deactivateSupplier } = useSuppliers();

  const [search, setSearch] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; supplier: Supplier } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('purchases.suppliers:create');
  const canUpdate = can('purchases.suppliers:update');
  const canSetActive = can('purchases.suppliers:deactivate');

  React.useEffect(() => {
    fetchSuppliers({ search: search || undefined });
  }, [fetchSuppliers, search]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateSupplier(pendingAction.supplier.id);
        toast.success(`El proveedor "${pendingAction.supplier.name}" fue desactivado.`);
      } else {
        await activateSupplier(pendingAction.supplier.id);
        toast.success(`El proveedor "${pendingAction.supplier.name}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Supplier>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (s) => <span className="font-medium text-text-primary">{s.name}</span>,
    },
    {
      key: 'tax_id',
      header: 'RIF / NIT',
      cell: (s) => <span className="text-text-secondary">{s.tax_id ?? '—'}</span>,
    },
    {
      key: 'email',
      header: 'Correo',
      cell: (s) => <span className="text-text-secondary">{s.email ?? '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Teléfono',
      cell: (s) => <span className="text-text-secondary">{s.phone ?? '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (s) => (
        <Badge variant={s.is_active ? 'success' : 'neutral'}>
          {s.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canUpdate && (
            <button
              onClick={() => navigate(`/suppliers/${s.id}/edit`)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar proveedor"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({ type: s.is_active ? 'deactivate' : 'activate', supplier: s })
              }
              className={`p-2 rounded-lg transition-colors ${
                s.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={s.is_active ? 'Desactivar proveedor' : 'Activar proveedor'}
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
        <CardTitle>Proveedores</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/suppliers/new')}
          >
            Nuevo Proveedor
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
          data={suppliers}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<Truck className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay proveedores'}
              description={
                search
                  ? 'No se encontraron proveedores que coincidan con la búsqueda.'
                  : 'Registra tu primer proveedor para poder crear órdenes de compra.'
              }
              action={
                !search && canCreate ? (
                  <Button onClick={() => navigate('/suppliers/new')}>
                    + Nuevo Proveedor
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
        title={pendingAction?.type === 'deactivate' ? 'Desactivar proveedor' : 'Activar proveedor'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.supplier.name}"? No podrá usarse en órdenes nuevas, pero se conserva su historial.`
            : `¿Activar "${pendingAction?.supplier.name}"? Volverá a estar disponible para operar.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
