import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, PackageCheck, Calendar, Truck, Store, FileText, Undo2 } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { usePurchaseOrders } from '@/application/hooks/usePurchaseOrders';
import { usePurchaseReceipts } from '@/application/hooks/usePurchaseReceipts';
import { useSuppliers } from '@/application/hooks/useSuppliers';
import { useProducts } from '@/application/hooks/useProducts';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useBranches } from '@/application/hooks/useBranches';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { formatCurrency, formatDate } from '@/shared/utils/format';
import type { PurchaseOrder, PurchaseOrderDetail } from '@/domain/models';

/**
 * Detalle de una orden de compra (RF-PUR-006/007) y punto de recepción.
 *
 * La orden es inmutable: aquí no se edita nada. La única acción de escritura
 * es registrar su recepción (RN-PUR-010: una sola vez), que exige un almacén
 * activo de la sucursal de destino.
 */
export function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { getOrder, refreshSelected } = usePurchaseOrders();
  const { createReceipt } = usePurchaseReceipts();
  const { suppliers, fetchSuppliers } = useSuppliers();
  const { products, fetchProducts } = useProducts();
  const { warehouses, fetchWarehouses } = useWarehouses();
  // Carga las sucursales al montar (el store no se hidrata solo)
  const { branches } = useBranches();
  const { can } = usePermissions();

  const canReceive = can('purchases.purchase_receipts:create');

  const [order, setOrder] = React.useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [warehouseId, setWarehouseId] = React.useState('');
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Catálogos de apoyo para mostrar nombres en lugar de UUIDs
  React.useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [fetchSuppliers, fetchProducts]);

  React.useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);

    getOrder(id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setLoadError('No se encontró la orden de compra solicitada.');
          return;
        }
        setOrder(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, getOrder]);

  // Al abrir el modal se cargan los almacenes activos de la sucursal destino
  React.useEffect(() => {
    if (!isModalOpen || !order) return;
    fetchWarehouses({ branchId: order.branch_id, isActive: true });
  }, [isModalOpen, order, fetchWarehouses]);

  const supplierName = (supplierId: string) =>
    suppliers.find((s) => s.id === supplierId)?.name ?? '—';
  const branchName = (branchId: string) => branches.find((b) => b.id === branchId)?.name ?? '—';

  const productName = (productId: string) =>
    products.find((p) => p.id === productId)?.name ?? '—';

  const openModal = () => {
    setWarehouseId('');
    setNote('');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleReceive = async () => {
    if (!order) return;

    if (!warehouseId) {
      setErrors({ warehouse_id: 'Selecciona el almacén de ingreso.' });
      return;
    }

    setIsSaving(true);
    try {
      const receipt = await createReceipt({
        order_id: order.id,
        warehouse_id: warehouseId,
        note: note.trim() || undefined,
      });
      // La recepción cambia el estado derivado de la orden
      const updated = await refreshSelected(order.id);
      if (updated) setOrder(updated);
      setIsModalOpen(false);
      toast.success(`La recepción ${receipt.code} fue registrada.`);
    } catch (err) {
      // El backend devuelve mensajes específicos (ya recibida, almacén inactivo...)
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar la recepción.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando orden de compra..." />;
  }

  if (loadError || !order) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">
          {loadError ?? 'No se encontró la orden de compra solicitada.'}
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/purchases/orders')}>
          Volver a Órdenes
        </Button>
      </Card>
    );
  }

  const isPending = order.status === 'pending';

  const columns: TableColumn<PurchaseOrderDetail>[] = [
    {
      key: 'product_id',
      header: 'Producto',
      cell: (d) => <span className="font-medium text-text-primary">{productName(d.product_id)}</span>,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      cell: (d) => <span className="text-text-secondary">{d.quantity}</span>,
    },
    {
      key: 'unit_price',
      header: 'Precio unit.',
      align: 'right',
      cell: (d) => <span className="text-text-secondary">{formatCurrency(d.unit_price)}</span>,
    },
    {
      key: 'line_total',
      header: 'Importe',
      align: 'right',
      cell: (d) => <span className="font-medium text-text-primary">{formatCurrency(d.line_total)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Orden {order.code}</CardTitle>
          <Badge variant={isPending ? 'warning' : 'success'}>
            {isPending ? 'Pendiente' : 'Recibida'}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/purchases/orders')}
          >
            Volver
          </Button>
          {isPending && canReceive && (
            <Button leftIcon={<PackageCheck className="h-4 w-4" />} onClick={openModal}>
              Registrar recepción
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Datos de la orden */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-3">
            <Truck className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Proveedor</p>
              <p className="text-sm font-medium text-text-primary">{supplierName(order.supplier_id)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Store className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Sucursal destino</p>
              <p className="text-sm font-medium text-text-primary">{branchName(order.branch_id)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Calendar className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Fecha de registro</p>
              <p className="text-sm font-medium text-text-primary">{formatDate(order.created_at)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Nota</p>
              <p className="text-sm text-text-secondary">{order.note || '—'}</p>
            </div>
          </div>
        </div>

        {!isPending && order.receipt_id && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-semantic-success-200 bg-semantic-success-50 px-4 py-3 text-sm text-semantic-success-800">
            <PackageCheck className="h-4 w-4 flex-shrink-0" />
            <span>
              Esta orden ya fue recibida. Puedes verla en{' '}
              <Link className="font-medium underline" to="/purchases/receipts">
                Recepciones
              </Link>
              .
            </span>
          </div>
        )}
      </Card>

      {/* Líneas */}
      <Card padding="none">
        <div className="p-4 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">Líneas de la orden</h3>
        </div>
        <Table columns={columns} data={order.details} rowKey={(d) => d.id} />
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border-subtle">
          <span className="text-sm text-text-tertiary">Total:</span>
          <span className="text-lg font-bold text-text-primary">{formatCurrency(order.total)}</span>
        </div>
      </Card>

      {/* Recepción */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar recepción"
        size="lg"
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleReceive} isLoading={isSaving}>
              Registrar recepción
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-tertiary">
            Al registrar la recepción, el backend genera el movimiento de entrada en el inventario
            de la sucursal {branchName(order.branch_id)}. Una orden se puede recibir una sola vez.
          </p>

          <Select
            label="Almacén de ingreso"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setErrors({});
            }}
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            placeholder={
              warehouses.length === 0
                ? 'No hay almacenes activos en esta sucursal'
                : 'Selecciona el almacén'
            }
            error={errors.warehouse_id || undefined}
            helperText="Solo se listan almacenes activos de la sucursal de destino."
            required
          />

          <Textarea
            label="Nota"
            placeholder="Ej: Mercancía recibida completa y en buen estado."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            helperText="Opcional."
            maxLength={500}
          />

          {order.receipt_id && (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Undo2 className="h-3.5 w-3.5" />
              <span>Esta orden ya está recibida: el backend rechazará un segundo registro.</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
