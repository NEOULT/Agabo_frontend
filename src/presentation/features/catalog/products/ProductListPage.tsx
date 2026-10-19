import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Power, Eye } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useProducts } from '@/application/hooks/useProducts';
import { useCategories } from '@/application/hooks/useCategories';
import { useBrands } from '@/application/hooks/useBrands';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import type { Product } from '@/domain/models';

/**
 * Catálogo de productos (catalog.product).
 *
 * Muestra los productos con su categoría, marca y código principal. Los
 * productos no se eliminan: se activan/desactivan.
 */
export function ProductListPage() {
  const navigate = useNavigate();
  const { products, isLoading, error, fetchProducts, activateProduct, deactivateProduct } = useProducts();
  const { categories, fetchCategories } = useCategories();
  const { brands, fetchBrands } = useBrands();
  const { can } = usePermissions();

  const canCreate = can('catalog.products:create');
  const canSetActive = can('catalog.products:deactivate');

  const [search, setSearch] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; product: Product } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  React.useEffect(() => {
    fetchProducts({ search: search || undefined });
  }, [fetchProducts, search]);

  // Catálogo de apoyo para mostrar nombres en lugar de UUIDs
  React.useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, [fetchCategories, fetchBrands]);

  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name;
  const brandName = (id?: string) => brands.find((b) => b.id === id)?.name;

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateProduct(pendingAction.product.id);
        toast.success(`El producto "${pendingAction.product.name}" fue desactivado.`);
      } else {
        await activateProduct(pendingAction.product.id);
        toast.success(`El producto "${pendingAction.product.name}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Product>[] = [
    {
      key: 'code',
      header: 'Código',
      cell: (p) => {
        const primary = p.codes.find((c) => c.is_primary) ?? p.codes[0];
        return (
          <span className="font-mono text-xs text-text-tertiary">{primary?.code ?? '—'}</span>
        );
      },
    },
    {
      key: 'name',
      header: 'Producto',
      cell: (p) => (
        <div>
          <p className="font-medium text-text-primary">{p.name}</p>
          {p.description && (
            <p className="text-xs text-text-tertiary truncate max-w-[280px]">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category_id',
      header: 'Categoría',
      cell: (p) => <span className="text-text-secondary">{categoryName(p.category_id) ?? '—'}</span>,
    },
    {
      key: 'brand_id',
      header: 'Marca',
      cell: (p) => <span className="text-text-secondary">{brandName(p.brand_id) ?? '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (p) => (
        <Badge variant={p.is_active ? 'success' : 'neutral'}>{p.is_active ? 'Activo' : 'Inactivo'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => navigate(`/catalog/products/${p.id}`)}
            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
            title="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </button>
          {canSetActive && (
            <button
              onClick={() => setPendingAction({ type: p.is_active ? 'deactivate' : 'activate', product: p })}
              className={`p-2 rounded-lg transition-colors ${
                p.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={p.is_active ? 'Desactivar producto' : 'Activar producto'}
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Productos</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/catalog/products/new')}>
            Nuevo Producto
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o código..." />
        </div>

        <Table
          columns={columns}
          data={products}
          rowKey={(p) => p.id}
          isLoading={isLoading}
          onRowClick={(p) => navigate(`/catalog/products/${p.id}`)}
          emptyState={
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay productos'}
              description={
                search
                  ? 'No se encontraron productos que coincidan con la búsqueda.'
                  : 'Registra tu primer producto. Antes necesitas al menos una unidad de medida.'
              }
              action={
                !search && canCreate ? (
                  <Button onClick={() => navigate('/catalog/products/new')}>+ Nuevo Producto</Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar producto' : 'Activar producto'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.product.name}"? No podrá usarse en nuevas operaciones, pero conserva su historial.`
            : `¿Activar "${pendingAction?.product.name}"? La categoría y la marca deben estar activas para poder activarlo.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
