import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, MapPin, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { Select } from '@/presentation/components/ui/Select';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useLocations } from '@/application/hooks/useLocations';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort } from '@/shared/utils/format';
import type { Location } from '@/domain/models';

/**
 * Lista de ubicaciones del módulo Empresa (solo super_admin).
 *
 * Las ubicaciones pertenecen a un almacén, así que la página filtra por
 * sucursal → almacén. Se llega desde la lista de almacenes con
 * `?warehouse=<id>` o seleccionando manualmente.
 */
export function LocationListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { locations, isLoading, error, fetchLocations, activateLocation, deactivateLocation } = useLocations();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const branches = useBranchStore((s) => s.branches);
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const activeBranches = React.useMemo(
    () => branches.filter((b) => b.is_active),
    [branches],
  );

  // Almacén activo viene de la URL (?warehouse=...) o se elige en el selector
  const warehouseFromUrl = searchParams.get('warehouse') ?? '';
  const [branchId, setBranchId] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState(warehouseFromUrl);
  const [search, setSearch] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; location: Location } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const selectedBranchId = branchId || activeBranch?.id || '';

  // Carga los almacenes de la sucursal seleccionada (solo activos)
  React.useEffect(() => {
    if (!selectedBranchId) return;
    fetchWarehouses({ branchId: selectedBranchId, isActive: true });
  }, [fetchWarehouses, selectedBranchId]);

  // Sincroniza el almacén de la URL con la sucursal: si el almacén viene de
  // otra sucursal, se ajusta la sucursal seleccionada
  React.useEffect(() => {
    if (!warehouseFromUrl) return;
    const warehouse = warehouses.find((w) => w.id === warehouseFromUrl);
    if (warehouse && warehouse.branch_id !== selectedBranchId) {
      setBranchId(warehouse.branch_id);
    }
  }, [warehouseFromUrl, warehouses, selectedBranchId]);

  // Carga las ubicaciones del almacén seleccionado
  React.useEffect(() => {
    fetchLocations({
      warehouseId: warehouseId || undefined,
      search: search || undefined,
    });
  }, [fetchLocations, warehouseId, search]);

  const handleWarehouseChange = (value: string) => {
    setWarehouseId(value);
    // Mantiene la URL en sincronía para poder enlazar/compartir la vista
    if (value) {
      setSearchParams({ warehouse: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateLocation(pendingAction.location.id);
        toast.success(`La ubicación "${pendingAction.location.name}" fue desactivada.`);
      } else {
        await activateLocation(pendingAction.location.id);
        toast.success(`La ubicación "${pendingAction.location.name}" fue activada.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Location>[] = [
    {
      key: 'code',
      header: 'Código',
      cell: (l) => <span className="font-mono text-xs text-text-tertiary">{l.code}</span>,
    },
    {
      key: 'name',
      header: 'Nombre',
      cell: (l) => <span className="font-medium text-text-primary">{l.name}</span>,
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (l) =>
        l.type ? (
          <Badge variant="info">{l.type}</Badge>
        ) : (
          <span className="text-text-disabled">—</span>
        ),
    },
    {
      key: 'updated_at',
      header: 'Actualizada',
      cell: (l) => <span className="text-text-tertiary">{formatDateShort(l.updated_at)}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (l) => (
        <Badge variant={l.is_active ? 'success' : 'neutral'}>
          {l.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (l) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/company/locations/${l.id}/edit`)}
            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
            title="Editar ubicación"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              setPendingAction({ type: l.is_active ? 'deactivate' : 'activate', location: l })
            }
            className={`p-2 rounded-lg transition-colors ${
              l.is_active
                ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
            }`}
            title={l.is_active ? 'Desactivar ubicación' : 'Activar ubicación'}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Ubicaciones</CardTitle>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate(`/company/locations/new${warehouseId ? `?warehouse=${warehouseId}` : ''}`)}
          disabled={!warehouseId}
        >
          Nueva Ubicación
        </Button>
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
              onChange={(e) => {
                setBranchId(e.target.value);
                // Al cambiar de sucursal se limpia el almacén seleccionado
                handleWarehouseChange('');
              }}
              options={activeBranches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder={activeBranches.length === 0 ? 'No hay sucursales activas' : 'Selecciona una sucursal'}
              aria-label="Filtrar por sucursal"
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <Select
              value={warehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
              placeholder={warehouses.length === 0 ? 'No hay almacenes en esta sucursal' : 'Selecciona un almacén'}
              disabled={!selectedBranchId || warehouses.length === 0}
              aria-label="Filtrar por almacén"
            />
          </div>
          <div className="w-full sm:max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre o código..."
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={locations}
          rowKey={(l) => l.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title={
                !warehouseId
                  ? 'Selecciona un almacén'
                  : search
                    ? 'Sin resultados'
                    : 'No hay ubicaciones'
              }
              description={
                !warehouseId
                  ? 'Elige un almacén para ver y gestionar sus ubicaciones.'
                  : search
                    ? 'No se encontraron ubicaciones que coincidan con la búsqueda.'
                    : 'Registra la primera ubicación de este almacén (estantes, zonas de recepción...).'
              }
              action={
                !search && warehouseId ? (
                  <Button onClick={() => navigate(`/company/locations/new?warehouse=${warehouseId}`)}>
                    + Nueva Ubicación
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
        title={pendingAction?.type === 'deactivate' ? 'Desactivar ubicación' : 'Activar ubicación'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.location.name}"? Dejará de estar disponible para nuevos movimientos de inventario, pero conserva su historial.`
            : `¿Activar "${pendingAction?.location.name}"? Volverá a estar disponible para operar.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
