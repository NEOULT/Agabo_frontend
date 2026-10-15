import React from 'react';
import { Package, Pencil, Plus, Power } from 'lucide-react';
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
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useProducts } from '@/application/hooks/useProducts';
import { useLocations } from '@/application/hooks/useLocations';
import { usePermissions } from '@/application/hooks/usePermissions';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort } from '@/shared/utils/format';
import type { Location, Stock } from '@/domain/models';

interface FormState {
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: string;
}

const emptyForm: FormState = { productId: '', warehouseId: '', locationId: '', quantity: '0' };

/**
 * Existencias de inventario (`inventory.stock`, RF-INV-009 a RF-INV-012).
 *
 * Una existencia es la cantidad de un producto en un almacén (y, si aplica, en
 * una ubicación). Solo puede haber una por producto, almacén y ubicación
 * (RN-INV-003): si ya existe, el backend responde 409 al registrarla.
 */
export function StockPage() {
  const { stocks, isLoading, error, fetchStocks, createStock, updateStock, activateStock, deactivateStock } =
    useStock();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const { products, fetchProducts } = useProducts();
  const { fetchLocations } = useLocations();
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
  const [modalLocations, setModalLocations] = React.useState<Location[]>([]);
  const [formError, setFormError] = React.useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState(false);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; stock: Stock } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  React.useEffect(() => {
    fetchWarehouses({ branchId: activeBranch?.id || undefined });
    fetchProducts({ isActive: true });
  }, [fetchWarehouses, fetchProducts, activeBranch?.id]);

  React.useEffect(() => {
    fetchStocks({
      warehouseId: warehouseId || undefined,
      productId: productId || undefined,
      isActive: status === '' ? undefined : status === 'true',
    });
  }, [fetchStocks, warehouseId, productId, status]);

  // Ubicaciones del almacén elegido en el modal (opcional en la existencia)
  const formWarehouseId = form.warehouseId;
  React.useEffect(() => {
    if (!formWarehouseId) {
      setModalLocations([]);
      return;
    }
    let cancelled = false;
    fetchLocations({ warehouseId: formWarehouseId, isActive: true }).then((data) => {
      if (!cancelled) setModalLocations(data);
    });
    return () => {
      cancelled = true;
    };
  }, [formWarehouseId, fetchLocations]);

  const productName = React.useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [products]);

  const warehouseName = React.useMemo(() => {
    const map = new Map(warehouses.map((w) => [w.id, w.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [warehouses]);

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
      locationId: stock.location_id ?? '',
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
        await updateStock(editing.id, {
          quantity,
          location_id: form.locationId || null,
        });
        toast.success('La existencia fue actualizada.');
      } else {
        await createStock({
          product_id: form.productId,
          warehouse_id: form.warehouseId,
          location_id: form.locationId || null,
          quantity,
        });
        toast.success('La existencia fue registrada.');
      }
      setIsModalOpen(false);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const hasFilters = Boolean(warehouseId || productId);

  const columns: TableColumn<Stock>[] = [
    {
      key: 'product',
      header: 'Producto',
      cell: (s) => <span className="font-medium text-text-primary">{productName(s.product_id)}</span>,
    },
    {
      key: 'warehouse',
      header: 'Almacén',
      cell: (s) => <span className="text-text-secondary">{warehouseName(s.warehouse_id)}</span>,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      cell: (s) => <span className="font-medium text-text-primary">{s.quantity}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (s) => (
        <Badge variant={s.is_active ? 'success' : 'neutral'}>
          {s.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'updated_at',
      header: 'Actualizado',
      cell: (s) => <span className="text-text-tertiary">{formatDateShort(s.updated_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button
              onClick={() => openEdit(s)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Ajustar existencia"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({ type: s.is_active ? 'deactivate' : 'activate', stock: s })
              }
              className={`p-2 rounded-lg transition-colors ${
                s.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={s.is_active ? 'Desactivar existencia' : 'Activar existencia'}
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

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={[
              { value: '', label: 'Todos los productos' },
              ...products.map((p) => ({ value: p.id, label: p.name })),
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
          data={stocks}
          rowKey={(s) => s.id}
          isLoading={isLoading}
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
        subtitle="Una existencia por producto, almacén y ubicación."
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
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Selecciona un producto"
                required
              />
              <Select
                label="Almacén"
                value={form.warehouseId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, warehouseId: e.target.value, locationId: '' }))
                }
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                placeholder="Selecciona un almacén"
                required
              />
            </>
          )}

          <Select
            label="Ubicación"
            value={form.locationId}
            onChange={(e) => setForm((prev) => ({ ...prev, locationId: e.target.value }))}
            options={[
              { value: '', label: 'Sin ubicación (opcional)' },
              ...modalLocations.map((l) => ({ value: l.id, label: l.name })),
            ]}
            disabled={!form.warehouseId}
          />

          <Input
            label="Cantidad"
            type="number"
            min={0}
            step="1"
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
    </div>
  );
}
