import React from 'react';
import { Plus, FolderTree, Pencil, Power } from 'lucide-react';
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
import { useCategories } from '@/application/hooks/useCategories';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';
import type { Category } from '@/domain/models';

interface FormValues {
  name: string;
  parent_id: string;
}

const emptyForm: FormValues = { name: '', parent_id: '' };

/**
 * Categorías (catalog.category).
 *
 * Admite jerarquía (categoría padre). Desactivar falla si la categoría tiene
 * productos activos (el backend lo valida y su mensaje se muestra al usuario).
 */
export function CategoryListPage() {
  const {
    categories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    activateCategory,
    deactivateCategory,
  } = useCategories();

  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [values, setValues] = React.useState<FormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof FormValues, string>>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; category: Category } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('catalog.categories:create');
  const canUpdate = can('catalog.categories:update');
  const canSetActive = can('catalog.categories:deactivate');

  React.useEffect(() => {
    fetchCategories({ search: search || undefined });
  }, [fetchCategories, search]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setValues({ name: category.name, parent_id: category.parent_id ?? '' });
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
        await updateCategory(editing.id, {
          name: values.name.trim(),
          parent_id: values.parent_id || null,
        });
        toast.success(`La categoría "${values.name.trim()}" fue actualizada.`);
      } else {
        await createCategory({
          name: values.name.trim(),
          parent_id: values.parent_id || undefined,
        });
        toast.success(`La categoría "${values.name.trim()}" fue creada.`);
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la categoría.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateCategory(pendingAction.category.id);
        toast.success(`La categoría "${pendingAction.category.name}" fue desactivada.`);
      } else {
        await activateCategory(pendingAction.category.id);
        toast.success(`La categoría "${pendingAction.category.name}" fue activada.`);
      }
      setPendingAction(null);
    } catch (err) {
      // El backend devuelve `category_has_active_products` con un mensaje claro
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name;

  const columns: TableColumn<Category>[] = [
    { key: 'name', header: 'Nombre', cell: (c) => <span className="font-medium text-text-primary">{c.name}</span> },
    {
      key: 'parent_id',
      header: 'Categoría padre',
      cell: (c) => <span className="text-text-secondary">{categoryName(c.parent_id) ?? '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (c) => (
        <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Activa' : 'Inactiva'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button
              onClick={() => openEdit(c)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar categoría"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() => setPendingAction({ type: c.is_active ? 'deactivate' : 'activate', category: c })}
              className={`p-2 rounded-lg transition-colors ${
                c.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={c.is_active ? 'Desactivar categoría' : 'Activar categoría'}
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
        <CardTitle>Categorías</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nueva Categoría
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
          data={categories}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<FolderTree className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay categorías'}
              description={
                search
                  ? 'No se encontraron categorías que coincidan con la búsqueda.'
                  : 'Organiza tu catálogo creando categorías. Asignarlas a un producto es opcional.'
              }
              action={!search && canCreate ? <Button onClick={openCreate}>+ Nueva Categoría</Button> : undefined}
            />
          }
        />
      </Card>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Lácteos"
            value={values.name}
            onChange={handleChange('name')}
            error={fieldErrors.name}
            required
            maxLength={100}
          />
          <Select
            label="Categoría padre"
            value={values.parent_id}
            onChange={handleChange('parent_id')}
            options={categories
              // Evita ofrecer la propia categoría como padre
              .filter((c) => c.id !== editing?.id)
              .map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Sin categoría padre (raíz)"
            helperText="Opcional. Permite organizar el catálogo en jerarquías."
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar categoría' : 'Activar categoría'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.category.name}"? No se permitirá si tiene productos activos.`
            : `¿Activar "${pendingAction?.category.name}"? Volverá a estar disponible para asignar a productos.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
