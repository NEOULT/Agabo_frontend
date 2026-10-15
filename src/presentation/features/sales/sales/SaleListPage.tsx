import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Store, Eye } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Select } from '@/presentation/components/ui/Select';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useSales } from '@/application/hooks/useSales';
import { useCustomers } from '@/application/hooks/useCustomers';
import { useBranches } from '@/application/hooks/useBranches';
import { usePermissions } from '@/application/hooks/usePermissions';
import { formatCurrency, formatDateShort } from '@/shared/utils/format';
import type { Sale, SalePaymentStatus } from '@/domain/models';

/** Etiqueta y color del estado de pago derivado (RN-SAL-006). */
const STATUS: Record<SalePaymentStatus, { label: string; variant: 'success' | 'warning' | 'info' }> =
  {
    pending: { label: 'Pendiente', variant: 'warning' },
    partial: { label: 'Parcial', variant: 'info' },
    paid: { label: 'Pagada', variant: 'success' },
  };

/**
 * Ventas (sales.sale).
 *
 * Las ventas son inmutables: se consultan y se les registran pagos, no se
 * editan. El estado de pago lo deriva el backend de los pagos activos.
 */
export function SaleListPage() {
  const navigate = useNavigate();
  const { sales, isLoading, error, fetchSales } = useSales();
  const { customers, fetchCustomers } = useCustomers();
  // Carga las sucursales al montar (el store no se hidrata solo)
  const { branches } = useBranches();

  const [paymentStatus, setPaymentStatus] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [branchId, setBranchId] = React.useState('');

  const { can } = usePermissions();
  const canCreate = can('sales.sales:create');

  React.useEffect(() => {
    fetchSales({
      paymentStatus: (paymentStatus as SalePaymentStatus) || undefined,
      customerId: customerId || undefined,
      branchId: branchId || undefined,
    });
  }, [fetchSales, paymentStatus, customerId, branchId]);

  // Catálogos de apoyo para mostrar nombres en lugar de UUIDs
  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const customerName = (id?: string) =>
    id ? (customers.find((c) => c.id === id)?.name ?? '—') : 'Consumidor final';
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  const columns: TableColumn<Sale>[] = [
    {
      key: 'code',
      header: 'Venta',
      cell: (s) => <span className="font-mono text-xs text-text-tertiary">{s.code}</span>,
    },
    {
      key: 'customer_id',
      header: 'Cliente',
      cell: (s) => (
        <span className="font-medium text-text-primary">{customerName(s.customer_id)}</span>
      ),
    },
    {
      key: 'branch_id',
      header: 'Sucursal',
      cell: (s) => <span className="text-text-secondary">{branchName(s.branch_id)}</span>,
    },
    {
      key: 'details',
      header: 'Líneas',
      align: 'center',
      cell: (s) => <span className="text-text-secondary">{s.details.length}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (s) => <span className="font-medium text-text-primary">{formatCurrency(s.total)}</span>,
    },
    {
      key: 'balance',
      header: 'Saldo',
      align: 'right',
      cell: (s) => (
        <span className={s.balance > 0 ? 'text-semantic-warning-700' : 'text-text-tertiary'}>
          {formatCurrency(s.balance)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Fecha',
      cell: (s) => <span className="text-text-tertiary">{formatDateShort(s.created_at)}</span>,
    },
    {
      key: 'payment_status',
      header: 'Pago',
      align: 'center',
      cell: (s) => (
        <Badge variant={STATUS[s.payment_status].variant}>{STATUS[s.payment_status].label}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/sales/history/${s.id}`)}
            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
            title={s.balance > 0 ? 'Ver detalle y registrar pago' : 'Ver detalle'}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/sales')}>
            Nueva Venta
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
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={[
                { value: 'pending', label: 'Pendientes' },
                { value: 'partial', label: 'Parciales' },
                { value: 'paid', label: 'Pagadas' },
              ]}
              placeholder="Todos los estados de pago"
              aria-label="Filtrar por estado de pago"
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Todos los clientes"
              aria-label="Filtrar por cliente"
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <Select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Todas las sucursales"
              aria-label="Filtrar por sucursal"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={sales}
          rowKey={(s) => s.id}
          isLoading={isLoading}
          onRowClick={(s) => navigate(`/sales/history/${s.id}`)}
          emptyState={
            <EmptyState
              icon={<Store className="h-12 w-12" />}
              title="No hay ventas"
              description="Abre el punto de venta para cobrar. Aquí verás el historial de las ventas registradas."
              action={
                canCreate ? (
                  <Button onClick={() => navigate('/sales')}>+ Nueva Venta</Button>
                ) : undefined
              }
            />
          }
        />
      </Card>
    </div>
  );
}
