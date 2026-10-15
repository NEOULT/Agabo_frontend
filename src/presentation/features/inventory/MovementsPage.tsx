import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Eye, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useInventory } from '@/application/hooks/useInventory';
import { useMovementTypes } from '@/application/hooks/useMovementTypes';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useProducts } from '@/application/hooks/useProducts';
import { usePermissions } from '@/application/hooks/usePermissions';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import type { Movement } from '@/domain/models';

/** Dirección del movimiento, deducida de los almacenes de la cabecera (RN-INV-008). */
function movementDirection(movement: Movement): 'Entrada' | 'Salida' | 'Transferencia' {
  if (movement.origin_warehouse_id && movement.destination_warehouse_id) return 'Transferencia';
  if (movement.destination_warehouse_id) return 'Entrada';
  return 'Salida';
}

function directionVariant(direction: string): 'success' | 'warning' | 'info' {
  if (direction === 'Entrada') return 'success';
  if (direction === 'Salida') return 'warning';
  return 'info';
}

/** Formatea fecha y hora (el movimiento interesa con su momento exacto). */
function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

/**
 * Historial de movimientos de inventario (RF-INV-015).
 *
 * Filtra por almacén, tipo, producto y rango de fechas. Filtrar por producto es
 * el kardex del artículo (RF-INV-024). Los movimientos son inmutables, así que
 * la única corrección es anularlos (RF-INV-016).
 */
export function MovementsPage() {
  const navigate = useNavigate();
  const { movements, isLoading, error, fetchMovements, reverseMovement } = useInventory();
  const { movementTypes, fetchMovementTypes } = useMovementTypes();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const { products, fetchProducts } = useProducts();
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const { can } = usePermissions();
  const canCreate = can('inventory.movements:create');
  const canReverse = can('inventory.movements:reverse');

  const [warehouseId, setWarehouseId] = React.useState('');
  const [movementTypeId, setMovementTypeId] = React.useState('');
  const [productId, setProductId] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const [selected, setSelected] = React.useState<Movement | null>(null);
  const [pendingReverse, setPendingReverse] = React.useState<Movement | null>(null);
  const [isReversing, setIsReversing] = React.useState(false);

  // Catálogos para los filtros y para resolver nombres
  React.useEffect(() => {
    fetchMovementTypes();
    fetchWarehouses({ branchId: activeBranch?.id || undefined });
    fetchProducts({ isActive: true });
  }, [fetchMovementTypes, fetchWarehouses, fetchProducts, activeBranch?.id]);

  React.useEffect(() => {
    fetchMovements({
      warehouseId: warehouseId || undefined,
      movementTypeId: movementTypeId || undefined,
      productId: productId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate ? `${toDate}T23:59:59` : undefined,
    });
  }, [fetchMovements, warehouseId, movementTypeId, productId, fromDate, toDate]);

  const warehouseName = React.useMemo(() => {
    const map = new Map(warehouses.map((w) => [w.id, w.name]));
    return (id?: string) => (id ? map.get(id) ?? '—' : '—');
  }, [warehouses]);

  const typeName = React.useMemo(() => {
    const map = new Map(movementTypes.map((t) => [t.id, t.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [movementTypes]);

  const productName = React.useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [products]);

  // Un movimiento está anulado si otro lo referencia como su original.
  const annulledIds = React.useMemo(
    () =>
      new Set(
        movements
          .map((m) => m.reversed_movement_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [movements],
  );

  const handleConfirmReverse = async () => {
    if (!pendingReverse) return;
    setIsReversing(true);
    try {
      await reverseMovement(pendingReverse.id);
      toast.success('El movimiento fue anulado y se registró su inverso.');
      setPendingReverse(null);
      // Recarga para reflejar el estado de las existencias y el nuevo inverso
      fetchMovements({
        warehouseId: warehouseId || undefined,
        movementTypeId: movementTypeId || undefined,
        productId: productId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate ? `${toDate}T23:59:59` : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo anular el movimiento.');
    } finally {
      setIsReversing(false);
    }
  };

  const hasFilters = Boolean(warehouseId || movementTypeId || productId || fromDate || toDate);

  const columns: TableColumn<Movement>[] = [
    {
      key: 'created_at',
      header: 'Fecha',
      cell: (m) => <span className="text-text-tertiary">{formatDateTime(m.created_at)}</span>,
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (m) => <span className="font-medium text-text-primary">{typeName(m.movement_type_id)}</span>,
    },
    {
      key: 'direction',
      header: 'Movimiento',
      cell: (m) => {
        const direction = movementDirection(m);
        return <Badge variant={directionVariant(direction)}>{direction}</Badge>;
      },
    },
    {
      key: 'warehouses',
      header: 'Origen → Destino',
      cell: (m) => (
        <span className="text-text-secondary">
          {warehouseName(m.origin_warehouse_id)} → {warehouseName(m.destination_warehouse_id)}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Referencia',
      cell: (m) => m.reference ?? <span className="text-text-disabled">—</span>,
    },
    {
      key: 'details',
      header: 'Líneas',
      align: 'center',
      cell: (m) => <span className="text-text-secondary">{m.details.length}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      align: 'center',
      cell: (m) => {
        if (annulledIds.has(m.id)) return <Badge variant="neutral">Anulado</Badge>;
        if (m.reversed_movement_id) return <Badge variant="warning">Anulación</Badge>;
        return <Badge variant="success">Registrado</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (m) => {
        const isAnnulled = annulledIds.has(m.id);
        const isReversal = Boolean(m.reversed_movement_id);
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelected(m)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Ver detalle"
            >
              <Eye className="h-4 w-4" />
            </button>
            {canReverse && !isAnnulled && !isReversal && (
              <button
                onClick={() => setPendingReverse(m)}
                className="p-2 rounded-lg text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary transition-colors"
                title="Anular movimiento"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Movimientos de Inventario</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/inventory/movements/new')}
          >
            Nuevo Movimiento
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            options={[
              { value: '', label: 'Todos los almacenes' },
              ...warehouses.map((w) => ({ value: w.id, label: w.name })),
            ]}
            aria-label="Filtrar por almacén"
          />
          <Select
            value={movementTypeId}
            onChange={(e) => setMovementTypeId(e.target.value)}
            options={[
              { value: '', label: 'Todos los tipos' },
              ...movementTypes.map((t) => ({ value: t.id, label: t.name })),
            ]}
            aria-label="Filtrar por tipo"
          />
          <Select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={[
              { value: '', label: 'Todos los productos' },
              ...products.map((p) => ({ value: p.id, label: p.name })),
            ]}
            aria-label="Filtrar por producto (kardex)"
          />
          <Input
            type="date"
            label="Desde"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            type="date"
            label="Hasta"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          {hasFilters && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setWarehouseId('');
                  setMovementTypeId('');
                  setProductId('');
                  setFromDate('');
                  setToDate('');
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>

        <Table
          columns={columns}
          data={movements}
          rowKey={(m) => m.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<ArrowLeftRight className="h-12 w-12" />}
              title={hasFilters ? 'Sin resultados' : 'No hay movimientos'}
              description={
                hasFilters
                  ? 'No se encontraron movimientos con los filtros aplicados.'
                  : 'Registra una entrada, salida o transferencia para empezar a mover tu inventario.'
              }
              action={
                !hasFilters && canCreate ? (
                  <Button onClick={() => navigate('/inventory/movements/new')}>
                    + Nuevo Movimiento
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      {/* Detalle del movimiento */}
      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title="Detalle del movimiento"
        subtitle={selected ? formatDateTime(selected.created_at) : undefined}
        size="xl"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-tertiary">Tipo</dt>
                <dd className="font-medium text-text-primary">{typeName(selected.movement_type_id)}</dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Movimiento</dt>
                <dd>
                  <Badge variant={directionVariant(movementDirection(selected))}>
                    {movementDirection(selected)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Origen</dt>
                <dd className="text-text-secondary">{warehouseName(selected.origin_warehouse_id)}</dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Destino</dt>
                <dd className="text-text-secondary">
                  {warehouseName(selected.destination_warehouse_id)}
                </dd>
              </div>
              {selected.reference && (
                <div>
                  <dt className="text-text-tertiary">Referencia</dt>
                  <dd className="text-text-secondary">{selected.reference}</dd>
                </div>
              )}
              {selected.note && (
                <div className="sm:col-span-2">
                  <dt className="text-text-tertiary">Nota</dt>
                  <dd className="text-text-secondary">{selected.note}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">
                Líneas ({selected.details.length})
              </p>
              <div className="overflow-x-auto rounded-lg border border-border-subtle">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary uppercase">
                        Producto
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-text-tertiary uppercase">
                        Cantidad
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary uppercase">
                        Lote
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {selected.details.map((detail) => (
                      <tr key={detail.id}>
                        <td className="px-3 py-2 text-text-primary">
                          {productName(detail.product_id)}
                        </td>
                        <td className="px-3 py-2 text-right text-text-secondary">
                          {detail.quantity}
                        </td>
                        <td className="px-3 py-2 text-text-tertiary">
                          {detail.lot_id ? detail.lot_id.slice(0, 8) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={pendingReverse !== null}
        onClose={() => setPendingReverse(null)}
        onConfirm={handleConfirmReverse}
        isLoading={isReversing}
        variant="danger"
        title="Anular movimiento"
        message="Se registrará el movimiento inverso con las mismas líneas y los almacenes intercambiados, y se actualizarán las existencias. El movimiento original no se modifica."
        confirmLabel="Anular"
      />
    </div>
  );
}
