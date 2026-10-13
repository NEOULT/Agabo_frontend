import { BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { EmptyState } from '@/presentation/components/shared/EmptyState';

export function MetricsPage() {
  return (
    <div>
      <CardHeader>
        <CardTitle>Métricas y Reportes</CardTitle>
      </CardHeader>

      <Card>
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="Métricas"
          description="Visualiza reportes y estadísticas de tu inventario."
        />
      </Card>
    </div>
  );
}
