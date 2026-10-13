import { Truck } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Button } from '@/presentation/components/ui/Button';
import { EmptyState } from '@/presentation/components/shared/EmptyState';

export function SupplierListPage() {
  return (
    <div>
      <CardHeader>
        <CardTitle>Proveedores</CardTitle>
        <Button>Nuevo Proveedor</Button>
      </CardHeader>

      <Card>
        <EmptyState
          icon={<Truck className="h-12 w-12" />}
          title="Proveedores"
          description="Gestiona tus proveedores y órdenes de compra aquí."
        />
      </Card>
    </div>
  );
}
