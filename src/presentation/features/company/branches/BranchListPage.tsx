import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Store, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useBranches } from '@/application/hooks/useBranches';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort } from '@/shared/utils/format';
import type { Branch } from '@/domain/models';

/**
 * Lista de sucursales del módulo Empresa (solo super_admin).
 *
 * Muestra todas las sucursales (activas e inactivas) con búsqueda,
 * edición y activación/desactivación — las sucursales nunca se eliminan.
 */
export function BranchListPage() {
  const navigate = useNavigate();
  const { branches, isLoading, error, fetchBranches, activateBranch, deactivateBranch } = useBranches();

  const [search, setSearch] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; branch: Branch } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  React.useEffect(() => {
    // Trae todas (activas e inactivas) para la vista de gestión
    fetchBranches({ search: search || undefined });
  }, [fetchBranches, search]);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateBranch(pendingAction.branch.id);
        toast.success(`La sucursal "${pendingAction.branch.name}" fue desactivada.`);
      } else {
        await activateBranch(pendingAction.branch.id);
        toast.success(`La sucursal "${pendingAction.branch.name}" fue activada.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Branch>[] = [
    {
      key: 'code',
      header: 'Código',
      cell: (branch) => (
        <span className="font-mono text-xs text-text-tertiary">{branch.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      cell: (branch) => (
        <span className="font-medium text-text-primary">{branch.name}</span>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      cell: (branch) => (
        <span className="text-text-secondary">{branch.address ?? '—'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      cell: (branch) => (
        <span className="text-text-secondary">{branch.phone ?? '—'}</span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Actualizada',
      cell: (branch) => (
        <span className="text-text-tertiary">{formatDateShort(branch.updated_at)}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (branch) => (
        <Badge variant={branch.is_active ? 'success' : 'neutral'}>
          {branch.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (branch) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => navigate(`/company/branches/${branch.id}/edit`)}
            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
            title="Editar sucursal"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              setPendingAction({
                type: branch.is_active ? 'deactivate' : 'activate',
                branch,
              })
            }
            className={`p-2 rounded-lg transition-colors ${
              branch.is_active
                ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
            }`}
            title={branch.is_active ? 'Desactivar sucursal' : 'Activar sucursal'}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Sucursales</CardTitle>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/company/branches/new')}
        >
          Nueva Sucursal
        </Button>
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre o código..."
          />
        </div>

        <Table
          columns={columns}
          data={branches}
          rowKey={(branch) => branch.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<Store className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay sucursales'}
              description={
                search
                  ? 'No se encontraron sucursales que coincidan con la búsqueda.'
                  : 'Registra la primera sucursal de tu empresa para empezar a operar.'
              }
              action={
                !search ? (
                  <Button onClick={() => navigate('/company/branches/new')}>
                    + Nueva Sucursal
                  </Button>
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
        title={pendingAction?.type === 'deactivate' ? 'Desactivar sucursal' : 'Activar sucursal'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.branch.name}"? Dejará de aceptar nuevas operaciones, pero conserva sus almacenes e historial.`
            : `¿Activar "${pendingAction?.branch.name}"? Volverá a estar disponible para operar (se consume cuota de la empresa).`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
