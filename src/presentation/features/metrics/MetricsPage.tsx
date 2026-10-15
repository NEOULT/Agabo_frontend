import React from 'react';
import { BarChart3, Package, RefreshCw, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { KpiCard } from '@/presentation/components/shared/KpiCard';
import { BarChart } from '@/presentation/components/shared/BarChart';
import { RankedBarList } from '@/presentation/components/shared/RankedBarList';
import { PeriodSelector, type PeriodValue } from '@/presentation/components/shared/PeriodSelector';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useMetrics } from '@/application/hooks/useMetrics';
import { formatCurrency } from '@/shared/utils/format';
import { resolvePeriod, formatRangeLabel } from '@/shared/utils/date-range';

/**
 * Métricas y reportes del negocio (RF de dashboard).
 *
 * Pensada para un abasto pequeño: cuánto vendió, cuánto tiene por cobrar
 * (fiado), cuánto compró, cómo está su inventario y qué se mueve más. Todo se
 * agrega sobre los repositorios existentes, así que no depende de un módulo de
 * reportes en el backend.
 */
export function MetricsPage() {
  const [period, setPeriod] = React.useState<PeriodValue>(() => ({
    preset: 'last30',
    range: resolvePeriod('last30'),
  }));

  const {
    isLoading,
    error,
    refetch,
    salesMetrics,
    purchaseMetrics,
    inventoryMetrics,
    dailySales,
    topProducts,
    paymentStatus,
    purchasesByStatus,
  } = useMetrics(period.range);

  // Primer carga: aún no hay nada que mostrar
  const isFirstLoad =
    isLoading && salesMetrics.count === 0 && inventoryMetrics.activeProducts === 0;

  if (isFirstLoad) {
    return <LoadingSpinner label="Cargando métricas..." />;
  }

  return (
    <div>
      <CardHeader>
        <CardTitle>Métricas y Reportes</CardTitle>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={refetch}
          isLoading={isLoading}
        >
          Actualizar
        </Button>
      </CardHeader>

      <Card className="mb-6">
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          rangeLabel={formatRangeLabel(period.range)}
        />
      </Card>

      {error && (
        <div className="mb-6 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      {/* Indicadores principales */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ventas del período"
          value={formatCurrency(salesMetrics.total)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="brand"
          hint={`${salesMetrics.count} ventas · ticket ${formatCurrency(salesMetrics.averageTicket)}`}
        />
        <KpiCard
          label="Por cobrar"
          value={formatCurrency(salesMetrics.pending)}
          icon={<Wallet className="h-5 w-5" />}
          variant="warning"
          hint={`${salesMetrics.pendingCount} ventas sin completar`}
          footer={
            <p className="text-xs text-text-muted">
              Cobrado: <span className="font-medium text-text-secondary">{formatCurrency(salesMetrics.collected)}</span>
            </p>
          }
        />
        <KpiCard
          label="Compras del período"
          value={formatCurrency(purchaseMetrics.total)}
          icon={<ShoppingCart className="h-5 w-5" />}
          variant="neutral"
          hint={`${purchaseMetrics.count} órdenes · ${purchaseMetrics.openCount} pendientes`}
          footer={
            <p className="text-xs text-text-muted">
              Por recibir:{' '}
              <span className="font-medium text-text-secondary">
                {formatCurrency(purchaseMetrics.openAmount)}
              </span>
            </p>
          }
        />
        <KpiCard
          label="Existencias"
          value={`${inventoryMetrics.units} u`}
          icon={<Package className="h-5 w-5" />}
          variant={inventoryMetrics.outOfStock > 0 ? 'danger' : 'success'}
          hint={`${inventoryMetrics.activeProducts} productos activos`}
          footer={
            <p className="text-xs text-text-muted">
              Agotados:{' '}
              <span
                className={`font-medium ${
                  inventoryMetrics.outOfStock > 0 ? 'text-semantic-danger-600' : 'text-text-secondary'
                }`}
              >
                {inventoryMetrics.outOfStock}
              </span>
            </p>
          }
        />
      </div>

      {/* Tendencia */}
      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-text-muted" />
            <h3 className="text-base font-semibold text-text-primary">Ventas por día</h3>
          </div>
          <span className="text-xs text-text-muted">{formatRangeLabel(period.range)}</span>
        </div>
        <BarChart
          data={dailySales}
          formatValue={formatCurrency}
          ariaLabel="Ventas por día del período"
        />
      </Card>

      {/* Desgloses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-base font-semibold text-text-primary">
            Productos más vendidos
          </h3>
          <RankedBarList
            items={topProducts}
            formatValue={formatCurrency}
            emptyLabel="Aún no hay ventas en el período."
          />
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold text-text-primary">Estado de pagos</h3>
          <RankedBarList
            items={paymentStatus}
            formatValue={formatCurrency}
            barClassName="bg-semantic-success-500"
            emptyLabel="Sin ventas en el período."
          />
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold text-text-primary">Compras por estado</h3>
          <RankedBarList
            items={purchasesByStatus}
            formatValue={formatCurrency}
            barClassName="bg-brand-300"
            emptyLabel="Sin órdenes de compra en el período."
          />
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold text-text-primary">
            Productos con menos existencia
          </h3>
          <RankedBarList
            items={inventoryMetrics.lowStock}
            formatValue={(value) => `${value} u`}
            barClassName="bg-semantic-warning-500"
            emptyLabel="No hay productos con existencia registrada."
          />
        </Card>
      </div>
    </div>
  );
}
