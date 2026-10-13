import { Store } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Button } from '@/presentation/components/ui/Button';
import { EmptyState } from '@/presentation/components/shared/EmptyState';

export function BranchListPage() {
  return (
    <div>
      <CardHeader>
        <CardTitle>Sedes</CardTitle>
        <Button>Nueva Sede</Button>
      </CardHeader>

      <Card>
        <EmptyState
          icon={<Store className="h-12 w-12" />}
          title="Sedes"
          description="Administra las sucursales de tu comercio."
        />
      </Card>
    </div>
  );
}
