import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Warehouse as WarehouseIcon, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { Select } from '@/presentation/components/ui/Select';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { usePermissions } from '@/application/hooks/usePermissions';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort } from '@/shared/utils/format';
import type { Warehouse } from '@/domain/models';

/**
 * Lista de almacenes del módulo Empresa (solo super_admin).
 *
 * Los almacenes pertenecen a una sucursal, así que la página filtra por la
 * sucursal seleccionada (por defecto la activa del navbar).
 */
export function WarehouseListPage() {
  const navigate = useNavigate();
  const { warehouses, isLoading, error, fetchWarehouses, activateWarehouse, deactivateWarehouse } = useWarehouses();
  const branches = useBranchStore((s) => s.branches);
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const activeBranches = React.useMemo(
    () => branches.filter((b) => b.is_active),
    [branches],
  );

  const [branchId, setBranchId] = React.useState<string>('');
  const [search, setSearch] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; warehouse: Warehouse } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('company.warehouses:create');
  const canUpdate = can('company.warehouses:update');
  const canSetActive = can('company.warehouses:deactivate');

  // La sucursal seleccionada: la elegida en el selector o, por defecto, la activa
  const selectedBranchId = branchId || activeBranch?.id || '';

  React.useEffect(() => {
    fetchWarehouses({
      branchId: selectedBranchId || undefined,
      search: search || undefined,
    });
  }, [fetchWarehouses, selectedBranchId, search]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateWarehouse(pendingAction.warehouse.id);
        toast.success(`El almacén "${pendingAction.warehouse.name}" fue desactivado.`);
      } else {
        await activateWarehouse(pendingAction.warehouse.id);
        toast.success(`El almacén "${pendingAction.warehouse.name}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Warehouse>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (w) => <span className="font-medium text-text-primary">{w.name}</span>,
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (w) =>
        w.type ? (
          <Badge variant="info">{w.type}</Badge>
        ) : (
          <span className="text-text-disabled">—</span>
        ),
    },
    {
      key: 'updated_at',
      header: 'Actualizado',
      cell: (w) => <span className="text-text-tertiary">{formatDateShort(w.updated_at)}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (w) => (
        <Badge variant={w.is_active ? 'success' : 'neutral'}>
          {w.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (w) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canUpdate && (
            <button
              onClick={() => navigate(`/company/warehouses/${w.id}/edit`)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar almacén"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({ type: w.is_active ? 'deactivate' : 'activate', warehouse: w })
              }
              className={`p-2 rounded-lg transition-colors ${
                w.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={w.is_active ? 'Desactivar almacén' : 'Activar almacén'}
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
        <CardTitle>Almacenes</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/company/warehouses/new')}
            disabled={!selectedBranchId}
          >
            Nuevo Almacén
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:max-w-xs">
            <Select
              value={selectedBranchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder={activeBranches.length === 0 ? 'No hay sucursales activas' : 'Selecciona una sucursal'}
              aria-label="Filtrar por sucursal"
            />
          </div>
          <div className="w-full sm:max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre..."
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={warehouses}
          rowKey={(w) => w.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<WarehouseIcon className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay almacenes'}
              description={
                search
                  ? 'No se encontraron almacenes que coincidan con la búsqueda.'
                  : 'Registra el primer almacén de esta sucursal para empezar a ubicar tu inventario.'
              }
              action={
                !search && selectedBranchId && canCreate ? (
                  <Button onClick={() => navigate('/company/warehouses/new')}>
                    + Nuevo Almacén
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
        title={pendingAction?.type === 'deactivate' ? 'Desactivar almacén' : 'Activar almacén'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.warehouse.name}"? Dejará de aceptar movimientos de inventario, pero conserva sus ubicaciones e historial.`
            : `¿Activar "${pendingAction?.warehouse.name}"? Volverá a estar disponible para operar.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
