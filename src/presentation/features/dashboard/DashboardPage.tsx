import React from 'react';
import { Package, CheckCircle2, Store } from 'lucide-react';
import { Card, CardTitle } from '@/presentation/components/ui/Card';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useProducts } from '@/application/hooks/useProducts';
import { useBranches } from '@/application/hooks/useBranches';

function KpiCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="bg-surface-primary rounded-xl border border-border-default border-t-4 border-t-brand-500 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-brand-50 text-brand-600">{icon}</div>
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

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (productsLoading) {
    return <LoadingSpinner label="Cargando dashboard..." />;
  }

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const activeBranches = branches.filter((b) => b.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          {activeBranch
            ? `Viendo datos de: ${activeBranch.name}`
            : 'Resumen general del catálogo'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          label="Productos"
          value={totalProducts.toString()}
          subtext="En el catálogo"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Productos activos"
          value={activeProducts.toString()}
          subtext="Disponibles para operar"
        />
        <KpiCard
          icon={<Store className="h-5 w-5" />}
          label="Sucursales activas"
          value={activeBranches.toString()}
          subtext="En operación"
        />
      </div>

      {/* Pendiente: métricas de inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Últimos movimientos</CardTitle>
          <p className="mt-2 text-sm text-text-tertiary">
            Se mostrarán aquí cuando se conecte el módulo de inventario.
          </p>
        </Card>

        <Card>
          <CardTitle>Existencias y valor de inventario</CardTitle>
          <p className="mt-2 text-sm text-text-tertiary">
            Requiere el módulo de inventario (stocks) y las listas de precios.
          </p>
        </Card>
      </div>
    </div>
  );
}
