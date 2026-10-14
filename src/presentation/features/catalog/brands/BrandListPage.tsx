import React from 'react';
import { Plus, Tags, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useBrands } from '@/application/hooks/useBrands';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';
import type { Brand } from '@/domain/models';

interface FormValues {
  name: string;
}

const emptyForm: FormValues = { name: '' };

/**
 * Marcas (catalog.brand).
 *
 * Las marcas se activan/desactivan, nunca se eliminan.
 */
export function BrandListPage() {
  const { brands, isLoading, error, fetchBrands, createBrand, updateBrand, activateBrand, deactivateBrand } = useBrands();

  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);
  const [values, setValues] = React.useState<FormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof FormValues, string>>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; brand: Brand } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('catalog.brands:create');
  const canUpdate = can('catalog.brands:update');
  const canSetActive = can('catalog.brands:deactivate');

  React.useEffect(() => {
    fetchBrands({ search: search || undefined });
  }, [fetchBrands, search]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setValues({ name: brand.name });
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleChange = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<keyof FormValues, string>> = {};
    const nameError = validate(values.name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 2, 'El nombre'),
      (v) => maxLength(v, 100, 'El nombre'),
    ]);
    if (nameError) errors.name = nameError;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      if (editing) {
        await updateBrand(editing.id, { name: values.name.trim() });
        toast.success(`La marca "${values.name.trim()}" fue actualizada.`);
      } else {
        await createBrand({
          name: values.name.trim(),
        });
        toast.success(`La marca "${values.name.trim()}" fue creada.`);
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la marca.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateBrand(pendingAction.brand.id);
        toast.success(`La marca "${pendingAction.brand.name}" fue desactivada.`);
      } else {
        await activateBrand(pendingAction.brand.id);
        toast.success(`La marca "${pendingAction.brand.name}" fue activada.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Brand>[] = [
    { key: 'name', header: 'Nombre', cell: (b) => <span className="font-medium text-text-primary">{b.name}</span> },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (b) => (
        <Badge variant={b.is_active ? 'success' : 'neutral'}>{b.is_active ? 'Activa' : 'Inactiva'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (b) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button
              onClick={() => openEdit(b)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar marca"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() => setPendingAction({ type: b.is_active ? 'deactivate' : 'activate', brand: b })}
              className={`p-2 rounded-lg transition-colors ${
                b.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={b.is_active ? 'Desactivar marca' : 'Activar marca'}
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
        <CardTitle>Marcas</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nueva Marca
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
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre..." />
        </div>

        <Table
          columns={columns}
          data={brands}
          rowKey={(b) => b.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<Tags className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay marcas'}
              description={
                search
                  ? 'No se encontraron marcas que coincidan con la búsqueda.'
                  : 'Registra las marcas de tus productos. Asignarlas a un producto es opcional.'
              }
              action={!search && canCreate ? <Button onClick={openCreate}>+ Nueva Marca</Button> : undefined}
            />
          }
        />
      </Card>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar Marca' : 'Nueva Marca'}
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {editing ? 'Guardar cambios' : 'Crear marca'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Colanta"
            value={values.name}
            onChange={handleChange('name')}
            error={fieldErrors.name}
            required
            maxLength={100}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar marca' : 'Activar marca'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.brand.name}"? No podrá asignarse a nuevos productos, pero los existentes conservan su referencia.`
            : `¿Activar "${pendingAction?.brand.name}"? Volverá a estar disponible para operar.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
