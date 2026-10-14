import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Select } from '@/presentation/components/ui/Select';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { usePurchaseReceipts } from '@/application/hooks/usePurchaseReceipts';
import { usePurchaseOrders } from '@/application/hooks/usePurchaseOrders';
import { useWarehouses } from '@/application/hooks/useWarehouses';
import { formatCurrency, formatDateShort } from '@/shared/utils/format';
import type { PurchaseReceipt } from '@/domain/models';

/**
 * Recepciones de compra (purchases.purchase_receipt).
 *
 * Son inmutables: se consultan y se navega a la orden recibida. No se editan
 * ni se eliminan (RN-PUR-011).
 */
export function PurchaseReceiptListPage() {
  const navigate = useNavigate();
  const { receipts, isLoading, error, fetchReceipts } = usePurchaseReceipts();
  const { orders, fetchOrders } = usePurchaseOrders();
  const { warehouses, fetchWarehouses } = useWarehouses();

  const [warehouseId, setWarehouseId] = React.useState('');

  React.useEffect(() => {
    fetchReceipts({ warehouseId: warehouseId || undefined });
  }, [fetchReceipts, warehouseId]);

  // Catálogos de apoyo para mostrar nombres en lugar de UUIDs
  React.useEffect(() => {
    fetchOrders();
    fetchWarehouses();
  }, [fetchOrders, fetchWarehouses]);

  const orderCode = (orderId: string) => orders.find((o) => o.id === orderId)?.code ?? '—';
  const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? '—';
  const orderTotal = (orderId: string) => orders.find((o) => o.id === orderId)?.total ?? 0;

  const columns: TableColumn<PurchaseReceipt>[] = [
    {
      key: 'code',
      header: 'Recepción',
      cell: (r) => <span className="font-mono text-xs text-text-tertiary">{r.code}</span>,
    },
    {
      key: 'order_id',
      header: 'Orden',
      cell: (r) => (
        <button
          className="font-mono text-xs font-medium text-brand-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/purchases/orders/${r.order_id}`);
          }}
        >
          {orderCode(r.order_id)}
        </button>
      ),
    },
    {
      key: 'warehouse_id',
      header: 'Almacén de ingreso',
      cell: (r) => <span className="text-text-secondary">{warehouseName(r.warehouse_id)}</span>,
    },
    {
      key: 'details',
      header: 'Líneas',
      align: 'center',
      cell: (r) => <span className="text-text-secondary">{r.details.length}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (r) => (
        <span className="font-medium text-text-primary">{formatCurrency(orderTotal(r.order_id))}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Fecha',
      cell: (r) => <span className="text-text-tertiary">{formatDateShort(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/purchases/orders/${r.order_id}`)}
            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
            title="Ver la orden recibida"
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
        <CardTitle>Recepciones de compra</CardTitle>
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle">
          <div className="w-full sm:max-w-xs">
            <Select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              placeholder="Todos los almacenes"
              aria-label="Filtrar por almacén"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={receipts}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          onRowClick={(r) => navigate(`/purchases/orders/${r.order_id}`)}
          emptyState={
            <EmptyState
              icon={<PackageCheck className="h-12 w-12" />}
              title="No hay recepciones"
              description="Las recepciones se generan al recibir una orden de compra. Las órdenes se reciben una sola vez."
            />
          }
        />
      </Card>
    </div>
  );
}
