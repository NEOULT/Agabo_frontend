import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  UserRound,
  Store,
  Warehouse,
  FileText,
  Power,
} from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Modal } from '@/presentation/components/ui/Modal';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useSales } from '@/application/hooks/useSales';
import { usePayments } from '@/application/hooks/usePayments';
import { usePaymentMethods } from '@/application/hooks/usePaymentMethods';
import { useCustomers } from '@/application/hooks/useCustomers';
import { useProducts } from '@/application/hooks/useProducts';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { useBranches } from '@/application/hooks/useBranches';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { formatCurrency, formatDate } from '@/shared/utils/format';
import type { Sale, SaleDetail, SalePayment, SalePaymentStatus } from '@/domain/models';

/** Etiqueta y color del estado de pago derivado (RN-SAL-006). */
const STATUS: Record<SalePaymentStatus, { label: string; variant: 'success' | 'warning' | 'info' }> =
  {
    pending: { label: 'Pendiente', variant: 'warning' },
    partial: { label: 'Parcial', variant: 'info' },
    paid: { label: 'Pagada', variant: 'success' },
  };

/**
 * Detalle de una venta (RF-SAL-010/011/022) y punto de pago.
 *
 * La venta es inmutable: aquí no se edita nada. Las acciones de escritura son
 * registrar pagos (RF-SAL-013) y activar/desactivar pagos (RF-SAL-015), que el
 * backend revalida contra el saldo de la venta (RN-SAL-010).
 */
export function SaleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { getSale, refreshSelected } = useSales();
  const { createPayment, activatePayment, deactivatePayment } = usePayments();
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethods();
  const { customers, fetchCustomers } = useCustomers();
  const { products, fetchProducts } = useProducts();
  const { warehouses, fetchWarehouses } = useWarehouses();
  // Carga las sucursales al montar (el store no se hidrata solo)
  const { branches } = useBranches();

  const { can } = usePermissions();
  const canPay = can('sales.payments:create');
  const canActivatePayment = can('sales.payments:activate');
  const canDeactivatePayment = can('sales.payments:deactivate');

  const [sale, setSale] = React.useState<Sale | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [paymentMethodId, setPaymentMethodId] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; payment: SalePayment } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  // Catálogos de apoyo para mostrar nombres en lugar de UUIDs
  React.useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchPaymentMethods();
  }, [fetchCustomers, fetchProducts, fetchPaymentMethods]);

  React.useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);

    getSale(id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setLoadError('No se encontró la venta solicitada.');
          return;
        }
        setSale(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, getSale]);

  // El nombre del almacén de origen depende de la sucursal de la venta
  React.useEffect(() => {
    if (!sale) return;
    fetchWarehouses({ branchId: sale.branch_id });
  }, [sale, fetchWarehouses]);

  const customerName = (customerId?: string) =>
    customerId ? (customers.find((c) => c.id === customerId)?.name ?? '—') : 'Consumidor final';
  const branchName = (branchId: string) => branches.find((b) => b.id === branchId)?.name ?? '—';
  const warehouseName = (warehouseId: string) =>
    warehouses.find((w) => w.id === warehouseId)?.name ?? '—';
  const productName = (productId: string) => products.find((p) => p.id === productId)?.name ?? '—';
  const paymentMethodName = (paymentMethodId: string) =>
    paymentMethods.find((m) => m.id === paymentMethodId)?.name ?? '—';

  const openModal = () => {
    setPaymentMethodId('');
    // Se propone el saldo pendiente como importe por defecto
    setAmount(sale && sale.balance > 0 ? String(sale.balance) : '');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!sale) return;

    const validationErrors: Record<string, string> = {};
    if (!paymentMethodId) validationErrors.payment_method_id = 'Selecciona un método de pago.';
    const parsedAmount = Number(amount);
    if (amount.trim() === '' || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      validationErrors.amount = 'El importe debe ser mayor que cero.';
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      const payment = await createPayment({
        sale_id: sale.id,
        payment_method_id: paymentMethodId,
        amount: parsedAmount,
      });
      const updated = await refreshSelected(sale.id);
      if (updated) setSale(updated);
      setIsModalOpen(false);
      toast.success(`El pago de ${formatCurrency(payment.amount)} fue registrado.`);
    } catch (err) {
      // El backend devuelve mensajes específicos (excede el saldo, padre inactivo...)
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!sale || !pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivatePayment(pendingAction.payment.id);
        toast.success('El pago fue desactivado y ya no cuenta para el saldo.');
      } else {
        await activatePayment(pendingAction.payment.id);
        toast.success('El pago fue activado y vuelve a contar para el saldo.');
      }
      // El saldo y el estado de pago dependen de los pagos activos
      const updated = await refreshSelected(sale.id);
      if (updated) setSale(updated);
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Cargando venta..." />;
  }

  if (loadError || !sale) {
    return (
      <Card>
        <p className="text-sm text-semantic-danger-600">
          {loadError ?? 'No se encontró la venta solicitada.'}
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/sales/history')}>
          Volver al Historial
        </Button>
      </Card>
    );
  }

  const status = STATUS[sale.payment_status];

  const detailColumns: TableColumn<SaleDetail>[] = [
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

  const paymentColumns: TableColumn<SalePayment>[] = [
    {
      key: 'payment_method_id',
      header: 'Método',
      cell: (p) => (
        <span className="font-medium text-text-primary">{paymentMethodName(p.payment_method_id)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Importe',
      align: 'right',
      cell: (p) => <span className="font-medium text-text-primary">{formatCurrency(p.amount)}</span>,
    },
    {
      key: 'created_at',
      header: 'Fecha',
      cell: (p) => <span className="text-text-tertiary">{formatDate(p.created_at)}</span>,
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
          {p.is_active && canDeactivatePayment && (
            <button
              onClick={() => setPendingAction({ type: 'deactivate', payment: p })}
              className="p-2 rounded-lg text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary transition-colors"
              title="Desactivar pago"
            >
              <Power className="h-4 w-4" />
            </button>
          )}
          {!p.is_active && canActivatePayment && (
            <button
              onClick={() => setPendingAction({ type: 'activate', payment: p })}
              className="p-2 rounded-lg text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary transition-colors"
              title="Activar pago"
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Venta {sale.code}</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/sales/history')}
          >
            Volver
          </Button>
          {sale.balance > 0 && canPay && (
            <Button leftIcon={<CreditCard className="h-4 w-4" />} onClick={openModal}>
              Registrar pago
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Datos de la venta */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex gap-3">
            <UserRound className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Cliente</p>
              <p className="text-sm font-medium text-text-primary">{customerName(sale.customer_id)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Store className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Sucursal</p>
              <p className="text-sm font-medium text-text-primary">{branchName(sale.branch_id)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Warehouse className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Almacén de origen</p>
              <p className="text-sm font-medium text-text-primary">{warehouseName(sale.warehouse_id)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Calendar className="h-5 w-5 text-text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-text-tertiary">Fecha de registro</p>
              <p className="text-sm font-medium text-text-primary">{formatDate(sale.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <FileText className="h-5 w-5 text-text-muted flex-shrink-0" />
          <div>
            <p className="text-xs text-text-tertiary">Nota</p>
            <p className="text-sm text-text-secondary">{sale.note || '—'}</p>
          </div>
        </div>
      </Card>

      {/* Líneas */}
      <Card padding="none">
        <div className="p-4 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">Líneas de la venta</h3>
        </div>
        <Table columns={detailColumns} data={sale.details} rowKey={(d) => d.id} />
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border-subtle">
          <span className="text-sm text-text-tertiary">Total:</span>
          <span className="text-lg font-bold text-text-primary">{formatCurrency(sale.total)}</span>
        </div>
      </Card>

      {/* Pagos y saldo */}
      <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">Pagos</h3>
          {sale.balance > 0 && canPay && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CreditCard className="h-4 w-4" />}
              onClick={openModal}
            >
              Registrar pago
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 py-4 border-b border-border-subtle">
          <div>
            <p className="text-xs text-text-tertiary">Total</p>
            <p className="text-base font-semibold text-text-primary">{formatCurrency(sale.total)}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Pagado</p>
            <p className="text-base font-semibold text-semantic-success-700">
              {formatCurrency(sale.paid_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Saldo</p>
            <p
              className={`text-base font-semibold ${
                sale.balance > 0 ? 'text-semantic-warning-700' : 'text-text-primary'
              }`}
            >
              {formatCurrency(sale.balance)}
            </p>
          </div>
        </div>

        <Table
          columns={paymentColumns}
          data={sale.payments}
          rowKey={(p) => p.id}
          emptyState={
            <div className="py-8 text-center text-sm text-text-tertiary">
              Esta venta aún no tiene pagos. {sale.balance > 0 ? 'Su estado es pendiente.' : ''}
            </div>
          }
        />
      </Card>

      {/* Registrar pago */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar pago"
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
            <Button onClick={handleRegisterPayment} isLoading={isSaving}>
              Registrar pago
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-tertiary">
            La suma de los pagos activos no puede superar el total de la venta. El importe por
            defecto es el saldo pendiente ({formatCurrency(sale.balance)}).
          </p>

          <Select
            label="Método de pago"
            value={paymentMethodId}
            onChange={(e) => {
              setPaymentMethodId(e.target.value);
              setErrors((prev) => ({ ...prev, payment_method_id: '' }));
            }}
            options={paymentMethods
              .filter((m) => m.is_active)
              .map((m) => ({ value: m.id, label: m.name }))}
            placeholder={
              paymentMethods.filter((m) => m.is_active).length === 0
                ? 'No hay métodos de pago activos'
                : 'Selecciona el método'
            }
            error={errors.payment_method_id || undefined}
            required
          />

          <Input
            label="Importe"
            type="number"
            min="0.01"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors((prev) => ({ ...prev, amount: '' }));
            }}
            error={errors.amount || undefined}
            helperText={`Saldo pendiente: ${formatCurrency(sale.balance)}`}
            required
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar pago' : 'Activar pago'}
        message={
          pendingAction?.type === 'deactivate'
            ? '¿Desactivar este pago? Dejará de contar para el saldo de la venta, pero se conserva como historial.'
            : '¿Activar este pago? Volverá a contar para el saldo de la venta.'
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
