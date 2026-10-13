import React from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { LoadingSpinner } from '@/presentation/components/shared/LoadingSpinner';
import { useProducts } from '@/application/hooks/useProducts';
import { useBranchStore } from '@/application/stores/useBranchStore';
import { formatCurrency } from '@/shared/utils/format';

export function ProductListPage() {
  const { products, isLoading, fetchProducts } = useProducts();
  const activeBranch = useBranchStore((s) => s.activeBranch);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    fetchProducts({ branchId: activeBranch?.id, search });
  }, [fetchProducts, activeBranch, search]);

  return (
    <div>
      <CardHeader>
        <CardTitle>Productos</CardTitle>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Nuevo Producto</Button>
      </CardHeader>

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle">
          <Input
            placeholder="Buscar por nombre, SKU o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        {isLoading ? (
          <LoadingSpinner label="Cargando productos..." />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="No hay productos"
            description="Agrega tu primer producto para empezar a gestionar tu inventario."
            action={<Button>+ Nuevo Producto</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">Precio Compra</th>                      <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">Precio Venta</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wider">Atributos</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-surface-secondary transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-text-tertiary">{product.sku}</td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-text-tertiary">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-right text-text-secondary">{formatCurrency(product.purchase_price)}</td>
                    <td className="px-4 py-3 text-sm text-right text-text-secondary">{formatCurrency(product.sale_price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Object.entries(product.attributes).length > 0 ? (
                          Object.entries(product.attributes).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-brand-50 text-brand-700 whitespace-nowrap"
                              title={`${key}: ${value}`}
                            >
                              <span className="opacity-60">{key}:</span>
                              <span>{String(value)}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-text-disabled">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={product.is_active ? 'success' : 'neutral'}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
