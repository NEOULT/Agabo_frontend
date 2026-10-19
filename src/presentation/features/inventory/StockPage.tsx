import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  History as HistoryIcon,
  Package,
  Pencil,
  Plus,
  Power,
} from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useStock } from '@/application/hooks/useStock';
import { usePermissions } from '@/application/hooks/usePermissions';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort, formatQuantity } from '@/shared/utils/format';
import type { Stock } from '@/domain/models';
import { StockHistoryModal } from './StockHistoryModal';

interface FormState {
  productId: string;
  warehouseId: string;
  quantity: string;
}

const emptyForm: FormState = { productId: '', warehouseId: '', quantity: '0' };

/** Producto con su existencia total y el desglose por almacén. */
interface ProductStockGroup {
  product_id: string;
  total: number;
  stocks: Stock[];
  is_active: boolean;
  updated_at: string;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Existencias de inventario (`inventory.stock`, RF-INV-009 a RF-INV-012).
 *
 * La tabla muestra una fila por producto con la suma de todos sus almacenes.
 * Al expandir la fila se ve el saldo de cada almacén y desde ahí se ajusta,
 * activa/desactiva o consulta el historial de movimientos.
 */
export function StockPage() {
  const {
    stocks,
    products,
    warehouses,
    isLoading,
    error,
    fetchOverview,
    createStock,
    updateStock,
    activateStock,
    deactivateStock,
  } = useStock();
  const activeBranch = useBranchStore((s) => s.activeBranch);

  const { can } = usePermissions();
  const canCreate = can('inventory.stocks:create');
  const canUpdate = can('inventory.stocks:update');
  const canSetActive = can('inventory.stocks:deactivate');

  const [warehouseId, setWarehouseId] = React.useState('');
  const [productId, setProductId] = React.useState('');
  const [status, setStatus] = React.useState('true');

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Stock | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [formError, setFormError] = React.useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState(false);

  const [expandedProducts, setExpandedProducts] = React.useState<Set<string>>(new Set());
  const [historyStock, setHistoryStock] = React.useState<Stock | null>(null);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; stock: Stock } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const refreshList = React.useCallback(
    (filters?: { warehouseId?: string; productId?: string; isActive?: boolean }) => {
      const nextWarehouseId = filters?.warehouseId ?? (warehouseId || undefined);
      const nextProductId = filters?.productId ?? (productId || undefined);
      const nextIsActive =
        filters?.isActive ?? (status === '' ? undefined : status === 'true');

      return fetchOverview({
        branchId: activeBranch?.id || undefined,
        warehouseId: nextWarehouseId,
        productId: nextProductId,
        isActive: nextIsActive,
      });
    },
    [activeBranch?.id, fetchOverview, productId, status, warehouseId],
  );

  // Una sola petición llena existencias, productos y almacenes.
  React.useEffect(() => {
    fetchOverview({
      branchId: activeBranch?.id || undefined,
      warehouseId: warehouseId || undefined,
      productId: productId || undefined,
      isActive: status === '' ? undefined : status === 'true',
    });
  }, [activeBranch?.id, fetchOverview, warehouseId, productId, status]);

  const productName = React.useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [products]);

  const warehouseName = React.useMemo(() => {
    const map = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [warehouses]);

  const activeProducts = React.useMemo(
    () => products.filter((product) => product.is_active),
    [products],
  );
  const activeWarehouses = React.useMemo(
    () => warehouses.filter((warehouse) => warehouse.is_active),
    [warehouses],
  );

  // Una sola fila por producto: el saldo total es la suma de sus almacenes.
  const groups = React.useMemo<ProductStockGroup[]>(() => {
    const grouped = new Map<string, ProductStockGroup>();

    for (const stock of stocks) {
      const current = grouped.get(stock.product_id);

      if (!current) {
        grouped.set(stock.product_id, {
          product_id: stock.product_id,
          total: Number(stock.quantity),
          stocks: [stock],
          is_active: stock.is_active,
          updated_at: stock.updated_at,
        });
        continue;
      }

      current.total += Number(stock.quantity);
      current.stocks.push(stock);
      current.is_active = current.is_active || stock.is_active;
      if (stock.updated_at > current.updated_at) current.updated_at = stock.updated_at;
    }

    return [...grouped.values()]
      .map((group) => ({ ...group, total: round4(group.total) }))
      .sort((a, b) => productName(a.product_id).localeCompare(productName(b.product_id)));
  }, [productName, stocks]);

  const toggleExpanded = (value: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, warehouseId: warehouseId || '' });
    setFormError(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (stock: Stock) => {
    setEditing(stock);
    setForm({
      productId: stock.product_id,
      warehouseId: stock.warehouse_id,
      quantity: String(stock.quantity),
    });
    setFormError(undefined);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setFormError('La cantidad no puede ser negativa.');
      return;
    }
    if (!editing && (!form.productId || !form.warehouseId)) {
      setFormError('Selecciona el producto y el almacén.');
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await updateStock(editing.id, { quantity });
        toast.success('La existencia fue actualizada.');
      } else {
        await createStock({
          product_id: form.productId,
          warehouse_id: form.warehouseId,
          quantity,
        });
        setExpandedProducts((prev) => new Set(prev).add(form.productId));
        toast.success('La existencia fue registrada.');
      }
      setIsModalOpen(false);
      await refreshList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la existencia.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateStock(pendingAction.stock.id);
        toast.success('La existencia fue desactivada.');
      } else {
        await activateStock(pendingAction.stock.id);
        toast.success('La existencia fue activada.');
      }
      setPendingAction(null);
      await refreshList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const hasFilters = Boolean(warehouseId || productId);
  const canSubmit = activeProducts.length > 0 && activeWarehouses.length > 0;

  const columns: TableColumn<ProductStockGroup>[] = [
    {
      key: 'product',
      header: 'Producto',
      cell: (group) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleExpanded(group.product_id)}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
            title={expandedProducts.has(group.product_id) ? 'Ocultar almacenes' : 'Ver almacenes'}
          >
            {expandedProducts.has(group.product_id) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <span className="font-medium text-text-primary">{productName(group.product_id)}</span>
        </div>
      ),
    },
    {
      key: 'warehouses',
      header: 'Almacenes',
      align: 'center',
      cell: (group) => <span className="text-text-secondary">{group.stocks.length}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (group) => (
        <span className="font-semibold text-text-primary">{formatQuantity(group.total)}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (group) => (
        <Badge variant={group.is_active ? 'success' : 'neutral'}>
          {group.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'updated_at',
      header: 'Actualizado',
      cell: (group) => (
        <span className="text-text-tertiary">{formatDateShort(group.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (group) => (
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<HistoryIcon className="h-4 w-4" />}
          onClick={() => {
            if (group.stocks.length === 1) setHistoryStock(group.stocks[0]);
            else toggleExpanded(group.product_id);
          }}
        >
          {group.stocks.length === 1 ? 'Historial' : 'Almacenes'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Existencias</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Registrar Existencia
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      {!canSubmit && (
        <div className="mb-4 rounded-lg border border-semantic-warning-400 bg-semantic-warning-50 px-4 py-3 text-sm text-semantic-warning-800">
          Para registrar una existencia necesitas al menos un producto activo y un almacén activo.
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            options={[
              { value: '', label: 'Todos los almacenes' },
              ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
            ]}
            aria-label="Filtrar por almacén"
          />
          <Select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={[
              { value: '', label: 'Todos los productos' },
              ...products.map((product) => ({ value: product.id, label: product.name })),
            ]}
            aria-label="Filtrar por producto"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'true', label: 'Activas' },
              { value: 'false', label: 'Inactivas' },
              { value: '', label: 'Todas' },
            ]}
            aria-label="Filtrar por estado"
          />
        </div>

        <Table
          columns={columns}
          data={groups}
          rowKey={(group) => group.product_id}
          isLoading={isLoading}
          isRowExpanded={(group) => expandedProducts.has(group.product_id)}
          expandedRow={(group) => (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-3 px-2 text-xs font-medium uppercase tracking-wider text-text-tertiary">
                <div className="col-span-4">Almacén</div>
                <div className="col-span-2 text-right">Cantidad</div>
                <div className="col-span-2 text-center">Estado</div>
                <div className="col-span-2">Actualizado</div>
                <div className="col-span-2 text-right">Acciones</div>
              </div>

              {[...group.stocks]
                .sort((a, b) =>
                  warehouseName(a.warehouse_id).localeCompare(warehouseName(b.warehouse_id)),
                )
                .map((stock) => (
                  <div
                    key={stock.id}
                    className="grid grid-cols-12 items-center gap-3 rounded-lg border border-border-subtle bg-surface-primary px-3 py-2"
                  >
                    <div className="col-span-4 text-sm font-medium text-text-primary">
                      {warehouseName(stock.warehouse_id)}
                    </div>
                    <div className="col-span-2 text-right text-sm text-text-primary">
                      {formatQuantity(stock.quantity)}
                    </div>
                    <div className="col-span-2 text-center">
                      <Badge variant={stock.is_active ? 'success' : 'neutral'}>
                        {stock.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-xs text-text-tertiary">
                      {formatDateShort(stock.updated_at)}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setHistoryStock(stock)}
                        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-brand-600"
                        title="Ver historial"
                      >
                        <HistoryIcon className="h-4 w-4" />
                      </button>
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => openEdit(stock)}
                          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-brand-600"
                          title="Ajustar existencia"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canSetActive && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAction({
                              type: stock.is_active ? 'deactivate' : 'activate',
                              stock,
                            })
                          }
                          className={`rounded-lg p-2 transition-colors ${
                            stock.is_active
                              ? 'text-text-muted hover:bg-surface-tertiary hover:text-semantic-danger-600'
                              : 'text-text-muted hover:bg-surface-tertiary hover:text-semantic-success-600'
                          }`}
                          title={stock.is_active ? 'Desactivar existencia' : 'Activar existencia'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title={hasFilters ? 'Sin resultados' : 'No hay existencias'}
              description={
                hasFilters
                  ? 'No se encontraron existencias con los filtros aplicados.'
                  : 'Las existencias se crean al registrar movimientos o manualmente para ajustes.'
              }
              action={
                !hasFilters && canCreate ? (
                  <Button onClick={openCreate}>+ Registrar Existencia</Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Ajustar Existencia' : 'Registrar Existencia'}
        subtitle="Una existencia por producto y almacén."
        size="md"
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" form="stock-form" isLoading={isSaving}>
              {editing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </>
        }
      >
        <form id="stock-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {editing ? (
            <>
              <Input label="Producto" value={productName(editing.product_id)} disabled />
              <Input label="Almacén" value={warehouseName(editing.warehouse_id)} disabled />
            </>
          ) : (
            <>
              <Select
                label="Producto"
                value={form.productId}
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
                options={activeProducts.map((product) => ({
                  value: product.id,
                  label: product.name,
                }))}
                placeholder="Selecciona un producto"
                required
              />
              <Select
                label="Almacén"
                value={form.warehouseId}
                onChange={(e) => setForm((prev) => ({ ...prev, warehouseId: e.target.value }))}
                options={activeWarehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                }))}
                placeholder="Selecciona un almacén"
                required
              />
              <p className="text-xs text-text-tertiary">
                Si el producto ya tiene existencia en ese almacén, el backend rechaza el registro.
                Para sumar mercancía usa un movimiento de entrada.
              </p>
            </>
          )}

          <Input
            label="Cantidad"
            type="number"
            min={0}
            step="any"
            value={form.quantity}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, quantity: e.target.value }));
              if (formError) setFormError(undefined);
            }}
            error={formError}
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar existencia' : 'Activar existencia'}
        message={
          pendingAction?.type === 'deactivate'
            ? '¿Desactivar esta existencia? El backend lo rechaza si aún tiene cantidad mayor que cero.'
            : '¿Activar esta existencia? Volverá a estar disponible para operar.'
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />

      <StockHistoryModal
        isOpen={historyStock !== null}
        stock={historyStock}
        productName={historyStock ? productName(historyStock.product_id) : ''}
        warehouseName={historyStock ? warehouseName(historyStock.warehouse_id) : ''}
        onClose={() => setHistoryStock(null)}
      />
    </div>
  );
}
