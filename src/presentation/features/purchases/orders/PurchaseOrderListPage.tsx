import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Select } from '@/presentation/components/ui/Select';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { usePurchaseOrders } from '@/application/hooks/usePurchaseOrders';
import { useSuppliers } from '@/application/hooks/useSuppliers';
import { useBranches } from '@/application/hooks/useBranches';
import { usePermissions } from '@/application/hooks/usePermissions';
import { formatCurrency, formatDateShort } from '@/shared/utils/format';
import type { PurchaseOrder } from '@/domain/models';

/**
 * Órdenes de compra (purchases.purchase_order).
 *
 * Las órdenes son inmutables: se consultan y se reciben, no se editan.
 * El estado (pendiente/recibida) lo deriva el backend de la recepción.
 */
export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const { orders, isLoading, error, fetchOrders } = usePurchaseOrders();
  const { suppliers, fetchSuppliers } = useSuppliers();
  // Carga las sucursales al montar (el store no se hidrata solo)
  const { branches } = useBranches();

  const [status, setStatus] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
  const [branchId, setBranchId] = React.useState('');

  const { can } = usePermissions();
  const canCreate = can('purchases.purchase_orders:create');

  React.useEffect(() => {
    fetchOrders({
      status: (status as 'pending' | 'received') || undefined,
      supplierId: supplierId || undefined,
      branchId: branchId || undefined,
    });
  }, [fetchOrders, status, supplierId, branchId]);

  // Catálogos de apoyo para mostrar nombres en lugar de UUIDs
  React.useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? '—';
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  const columns: TableColumn<PurchaseOrder>[] = [
    {
      key: 'code',
      header: 'Orden',
      cell: (o) => <span className="font-mono text-xs text-text-tertiary">{o.code}</span>,
    },
    {
      key: 'supplier_id',
      header: 'Proveedor',
      cell: (o) => <span className="font-medium text-text-primary">{supplierName(o.supplier_id)}</span>,
    },
    {
      key: 'branch_id',
      header: 'Sucursal destino',
      cell: (o) => <span className="text-text-secondary">{branchName(o.branch_id)}</span>,
    },
    {
      key: 'details',
      header: 'Líneas',
      align: 'center',
      cell: (o) => <span className="text-text-secondary">{o.details.length}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (o) => <span className="font-medium text-text-primary">{formatCurrency(o.total)}</span>,
    },
    {
      key: 'created_at',
      header: 'Fecha',
      cell: (o) => <span className="text-text-tertiary">{formatDateShort(o.created_at)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      align: 'center',
      cell: (o) => (
        <Badge variant={o.status === 'received' ? 'success' : 'warning'}>
          {o.status === 'received' ? 'Recibida' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (o) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/purchases/orders/${o.id}`)}
            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
            title={o.status === 'pending' ? 'Ver detalle y recibir' : 'Ver detalle'}
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
        <CardTitle>Órdenes de compra</CardTitle>
        {canCreate && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/purchases/orders/new')}
          >
            Nueva Orden
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
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'pending', label: 'Pendientes' },
                { value: 'received', label: 'Recibidas' },
              ]}
              placeholder="Todos los estados"
              aria-label="Filtrar por estado"
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <Select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Todos los proveedores"
              aria-label="Filtrar por proveedor"
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
          data={orders}
          rowKey={(o) => o.id}
          isLoading={isLoading}
          onRowClick={(o) => navigate(`/purchases/orders/${o.id}`)}
          emptyState={
            <EmptyState
              icon={<ShoppingCart className="h-12 w-12" />}
              title="No hay órdenes de compra"
              description="Registra una orden para pedir mercancía a un proveedor. Necesitas proveedores, productos y sucursales activas."
              action={
                canCreate ? (
                  <Button onClick={() => navigate('/purchases/orders/new')}>
                    + Nueva Orden
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </Card>
    </div>
  );
}
