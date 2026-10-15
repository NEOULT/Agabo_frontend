import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Tags, Pencil, Power, ChevronRight } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { usePriceLists } from '@/application/hooks/usePriceLists';
import { useBranches } from '@/application/hooks/useBranches';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';
import type { PriceList } from '@/domain/models';

interface FormValues {
  branch_id: string;
  name: string;
}

const emptyForm: FormValues = { branch_id: '', name: '' };

/**
 * Listas de precios (catalog.price_list).
 *
 * Una lista pertenece a una sucursal. Se listan activas e inactivas con
 * búsqueda y filtro por sucursal; los precios de cada lista se administran
 * desde su detalle.
 */
export function PriceListListPage() {
  const navigate = useNavigate();
  const {
    priceLists,
    isLoading,
    error,
    fetchPriceLists,
    createPriceList,
    updatePriceList,
    activatePriceList,
    deactivatePriceList,
  } = usePriceLists();
  const { branches } = useBranches();

  const [search, setSearch] = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PriceList | null>(null);
  const [values, setValues] = React.useState<FormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [isSaving, setIsSaving] = React.useState(false);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; priceList: PriceList } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('catalog.price_lists:create');
  const canUpdate = can('catalog.price_lists:update');
  const canSetActive = can('catalog.price_lists:deactivate');

  React.useEffect(() => {
    fetchPriceLists({
      search: search || undefined,
      branchId: branchFilter || undefined,
      isActive: statusFilter === '' ? undefined : statusFilter === 'active',
    });
  }, [fetchPriceLists, search, branchFilter, statusFilter]);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  const openCreate = () => {
    setEditing(null);
    // La sucursal activa es el destino más probable de una lista nueva
    const defaultBranch = branches.find((b) => b.is_active)?.id ?? '';
    setValues({ ...emptyForm, branch_id: defaultBranch });
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (priceList: PriceList) => {
    setEditing(priceList);
    setValues({ branch_id: priceList.branch_id, name: priceList.name });
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleChange = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!editing) {
      const branchError = required(values.branch_id, 'La sucursal');
      if (branchError) errors.branch_id = branchError;
    }
    const nameError = validate(values.name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 3, 'El nombre'),
      (v) => maxLength(v, 200, 'El nombre'),
    ]);
    if (nameError) errors.name = nameError;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const name = values.name.trim();
      if (editing) {
        await updatePriceList(editing.id, { name });
        toast.success(`La lista "${name}" fue actualizada.`);
      } else {
        await createPriceList({ branch_id: values.branch_id, name });
        toast.success(`La lista "${name}" fue creada.`);
      }
      setFormOpen(false);
    } catch (err) {
      // El backend responde `parent_inactive` o `resource_not_found` con un
      // mensaje claro sobre la sucursal elegida.
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la lista de precios.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivatePriceList(pendingAction.priceList.id);
        toast.success(`La lista "${pendingAction.priceList.name}" fue desactivada.`);
      } else {
        await activatePriceList(pendingAction.priceList.id);
        toast.success(`La lista "${pendingAction.priceList.name}" fue activada.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<PriceList>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (p) => <span className="font-medium text-text-primary">{p.name}</span>,
    },
    {
      key: 'branch_id',
      header: 'Sucursal',
      cell: (p) => <span className="text-text-secondary">{branchName(p.branch_id)}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (p) => (
        <Badge variant={p.is_active ? 'success' : 'neutral'}>
          {p.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/catalog/price-lists/${p.id}`)}
            className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
            title="Ver precios de la lista"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {canUpdate && (
            <button
              onClick={() => openEdit(p)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar lista de precios"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({ type: p.is_active ? 'deactivate' : 'activate', priceList: p })
              }
              className={`p-2 rounded-lg transition-colors ${
                p.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={p.is_active ? 'Desactivar lista' : 'Activar lista'}
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const hasFilters = Boolean(search || branchFilter || statusFilter);

  return (
    <div>
      <CardHeader>
        <CardTitle>Listas de precios</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nueva Lista
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre..." />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Todas las sucursales"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: 'Activas' },
                { value: 'inactive', label: 'Inactivas' },
              ]}
              placeholder="Todos los estados"
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={priceLists}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/catalog/price-lists/${p.id}`)}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<Tags className="h-12 w-12" />}
              title={hasFilters ? 'Sin resultados' : 'No hay listas de precios'}
              description={
                hasFilters
                  ? 'No se encontraron listas que coincidan con los filtros aplicados.'
                  : 'Crea una lista por sucursal para definir los precios de tus productos.'
              }
              action={
                !hasFilters && canCreate ? (
                  <Button onClick={openCreate}>+ Nueva Lista</Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {editing ? 'Guardar cambios' : 'Crear lista'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {editing ? (
            <Input
              label="Sucursal"
              value={branchName(editing.branch_id)}
              disabled
              helperText="La sucursal de una lista no se puede cambiar."
            />
          ) : (
            <Select
              label="Sucursal"
              value={values.branch_id}
              onChange={handleChange('branch_id')}
              options={branches
                .filter((b) => b.is_active)
                .map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Selecciona una sucursal"
              error={fieldErrors.branch_id}
              helperText="Solo las sucursales activas pueden tener listas nuevas."
              required
            />
          )}

          <Input
            label="Nombre"
            placeholder="Ej: Lista Público"
            value={values.name}
            onChange={handleChange('name')}
            error={fieldErrors.name}
            helperText="Distingue esta lista de otras de la misma sucursal."
            required
            maxLength={200}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar lista' : 'Activar lista'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.priceList.name}"? Dejará de aplicarse a nuevas ventas, pero conserva sus precios e historial.`
            : `¿Activar "${pendingAction?.priceList.name}"? Volverá a aplicarse a las ventas de su sucursal.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
