import React from 'react';
import { Package, AlertTriangle, TrendingUp, Store } from 'lucide-react';
import { Card, CardTitle } from '@/presentation/components/ui/Card';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useProducts } from '@/application/hooks/useProducts';
import { useBranches } from '@/application/hooks/useBranches';
import { formatCurrency } from '@/shared/utils/format';

function KpiCard({
  icon,
  label,
  value,
  subtext,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-surface-primary rounded-xl border border-border-default border-t-4 border-t-brand-500 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </div>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend === 'up' ? 'text-semantic-success-600' : 'text-semantic-danger-600'
            }`}
          >
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-tertiary">{label}</p>
      {subtext && <p className="mt-1 text-xs text-text-muted">{subtext}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { products, isLoading: productsLoading, fetchProducts } = useProducts();
  const { branches, activeBranch } = useBranches();

  // Cargar productos al montar el componente o cambiar de sede
  React.useEffect(() => {
    fetchProducts({ branchId: activeBranch?.id });
  }, [fetchProducts, activeBranch]);

  if (productsLoading) {
    return <LoadingSpinner label="Cargando dashboard..." />;
  }

  // Calcular KPIs (simulados por ahora)
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + p.purchase_price * 50, 0);
  const lowStockItems = products.filter((p) => p.min_stock > 0).length;
  const activeBranches = branches.filter((b) => b.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          {activeBranch
            ? `Viendo datos de: ${activeBranch.name}`
            : 'Resumen general del inventario'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          label="Productos"
          value={totalProducts.toString()}
          subtext="En inventario"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Valor Total"
          value={formatCurrency(totalValue)}
          subtext="Costo de inventario"
          trend="up"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Stock Bajo"
          value={lowStockItems.toString()}
          subtext="Productos por reabastecer"
          trend="down"
        />
        <KpiCard
          icon={<Store className="h-5 w-5" />}
          label="Sedes Activas"
          value={activeBranches.toString()}
          subtext="En operación"
        />
      </div>

      {/* Placeholder para más contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Últimos Movimientos</CardTitle>
          <p className="mt-2 text-sm text-text-tertiary">
            Los movimientos recientes aparecerán aquí.
          </p>
        </Card>

        <Card>
          <CardTitle>Productos con Stock Bajo</CardTitle>
          <p className="mt-2 text-sm text-text-tertiary">
            Las alertas de inventario se mostrarán aquí.
          </p>
        </Card>
      </div>
    </div>
  );
}
