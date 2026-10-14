import { ArrowLeftRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Button } from '@/presentation/components/ui/Button';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { usePermissions } from '@/application/hooks/usePermissions';

export function MovementsPage() {
  const { can } = usePermissions();

  return (
    <div>
      <CardHeader>
        <CardTitle>Movimientos de Inventario</CardTitle>
        {can('inventory.movements:create') && <Button>Nuevo Movimiento</Button>}
      </CardHeader>

      <Card>
        <EmptyState
          icon={<ArrowLeftRight className="h-12 w-12" />}
          title="Movimientos"
          description="Registra entradas, salidas, ajustes y transferencias de inventario."
        />
      </Card>
    </div>
  );
}
