import React from 'react';
import { Plus, Ruler, Pencil, Power } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useUnits } from '@/application/hooks/useUnits';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';
import type { Unit } from '@/domain/models';

interface FormValues {
  name: string;
  abbreviation: string;
}

const emptyForm: FormValues = { name: '', abbreviation: '' };

/**
 * Unidades de medida (catalog.unit).
 *
 * Las unidades se activan/desactivan, nunca se eliminan.
 */
export function UnitListPage() {
  const { units, isLoading, error, fetchUnits, createUnit, updateUnit, activateUnit, deactivateUnit } = useUnits();

  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Unit | null>(null);
  const [values, setValues] = React.useState<FormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof FormValues, string>>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; unit: Unit } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const { can } = usePermissions();
  const canCreate = can('catalog.units:create');
  const canUpdate = can('catalog.units:update');
  const canSetActive = can('catalog.units:deactivate');

  React.useEffect(() => {
    fetchUnits({ search: search || undefined });
  }, [fetchUnits, search]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (unit: Unit) => {
    setEditing(unit);
    setValues({ name: unit.name, abbreviation: unit.abbreviation ?? '' });
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
        await updateUnit(editing.id, {
          name: values.name.trim(),
          abbreviation: values.abbreviation.trim() || null,
        });
        toast.success(`La unidad "${values.name.trim()}" fue actualizada.`);
      } else {
        await createUnit({
          name: values.name.trim(),
          abbreviation: values.abbreviation.trim() || undefined,
        });
        toast.success(`La unidad "${values.name.trim()}" fue creada.`);
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la unidad.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateUnit(pendingAction.unit.id);
        toast.success(`La unidad "${pendingAction.unit.name}" fue desactivada.`);
      } else {
        await activateUnit(pendingAction.unit.id);
        toast.success(`La unidad "${pendingAction.unit.name}" fue activada.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<Unit>[] = [
    { key: 'name', header: 'Nombre', cell: (u) => <span className="font-medium text-text-primary">{u.name}</span> },
    {
      key: 'abbreviation',
      header: 'Abreviatura',
      cell: (u) => <span className="text-text-secondary">{u.abbreviation ?? '—'}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (u) => (
        <Badge variant={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Activa' : 'Inactiva'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button
              onClick={() => openEdit(u)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar unidad"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() => setPendingAction({ type: u.is_active ? 'deactivate' : 'activate', unit: u })}
              className={`p-2 rounded-lg transition-colors ${
                u.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={u.is_active ? 'Desactivar unidad' : 'Activar unidad'}
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
        <CardTitle>Unidades de medida</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nueva Unidad
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
          data={units}
          rowKey={(u) => u.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<Ruler className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay unidades'}
              description={
                search
                  ? 'No se encontraron unidades que coincidan con la búsqueda.'
                  : 'Crea las unidades de medida (unidad, caja, kilogramo...) antes de registrar productos.'
              }
              action={!search && canCreate ? <Button onClick={openCreate}>+ Nueva Unidad</Button> : undefined}
            />
          }
        />
      </Card>

      {/* Formulario (modal) */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar Unidad' : 'Nueva Unidad'}
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {editing ? 'Guardar cambios' : 'Crear unidad'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Unidad"
            value={values.name}
            onChange={handleChange('name')}
            error={fieldErrors.name}
            required
            maxLength={100}
          />
          <Input
            label="Abreviatura"
            placeholder="Ej: un"
            value={values.abbreviation}
            onChange={handleChange('abbreviation')}
            error={fieldErrors.abbreviation}
            helperText="Opcional."
            maxLength={20}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar unidad' : 'Activar unidad'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.unit.name}"? No podrá asignarse a nuevos productos ni presentaciones, pero los existentes conservan su referencia.`
            : `¿Activar "${pendingAction?.unit.name}"? Volverá a estar disponible para operar.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
