import React from 'react';
import { Pencil, Plus, Power, Tags } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Input } from '@/presentation/components/ui/Input';
import { Select } from '@/presentation/components/ui/Select';
import { Textarea } from '@/presentation/components/ui/Textarea';
import { Modal } from '@/presentation/components/ui/Modal';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { ConfirmDialog } from '@/presentation/components/ui/ConfirmDialog';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useMovementTypes } from '@/application/hooks/useMovementTypes';
import { usePermissions } from '@/application/hooks/usePermissions';
import { toast } from '@/application/stores/useToastStore';
import { formatDateShort } from '@/shared/utils/format';
import { validate, required, minLength, maxLength } from '@/shared/utils/validations';
import type { MovementPurpose, MovementType } from '@/domain/models';

const PURPOSE_OPTIONS = [
  { value: '', label: 'Sin propósito' },
  { value: 'sale_out', label: 'Salida por venta' },
  { value: 'purchase_in', label: 'Entrada por compra' },
];

const PURPOSE_LABEL: Record<string, string> = {
  sale_out: 'Salida por venta',
  purchase_in: 'Entrada por compra',
};

interface FormState {
  name: string;
  description: string;
  purpose: string;
}

const emptyForm: FormState = { name: '', description: '', purpose: '' };

/**
 * Tipos de movimiento (`inventory.movement_type`, RF-INV-001 a RF-INV-004).
 *
 * El tipo es el motivo del movimiento y no fija su dirección. Un tipo puede
 * reservarse a `sale_out` o `purchase_in`; solo uno por empresa (RN-INV-018).
 * No se borra: se activa o desactiva.
 */
export function MovementTypesPage() {
  const {
    movementTypes,
    isLoading,
    error,
    fetchMovementTypes,
    createMovementType,
    updateMovementType,
    activateMovementType,
    deactivateMovementType,
  } = useMovementTypes();

  const { can } = usePermissions();
  const canCreate = can('inventory.movement_types:create');
  const canUpdate = can('inventory.movement_types:update');
  const canSetActive = can('inventory.movement_types:deactivate');

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MovementType | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [formError, setFormError] = React.useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState(false);

  const [pendingAction, setPendingAction] = React.useState<
    { type: 'activate' | 'deactivate'; movementType: MovementType } | null
  >(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  React.useEffect(() => {
    fetchMovementTypes();
  }, [fetchMovementTypes]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (movementType: MovementType) => {
    setEditing(movementType);
    setForm({
      name: movementType.name,
      description: movementType.description ?? '',
      purpose: movementType.purpose ?? '',
    });
    setFormError(undefined);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validate(form.name, [
      (v) => required(v, 'El nombre'),
      (v) => minLength(v, 3, 'El nombre'),
      (v) => maxLength(v, 200, 'El nombre'),
    ]);
    if (nameError) {
      setFormError(nameError);
      return;
    }

    const name = form.name.trim();
    const changes = {
      name,
      description: form.description.trim() || null,
      purpose: (form.purpose || null) as MovementPurpose | null,
    };

    setIsSaving(true);
    try {
      if (editing) {
        await updateMovementType(editing.id, changes);
        toast.success(`El tipo "${name}" fue actualizado.`);
      } else {
        await createMovementType(changes);
        toast.success(`El tipo "${name}" fue creado.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      // El backend devuelve 409 si el propósito ya está asignado (RN-INV-018)
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el tipo de movimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsActionLoading(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await deactivateMovementType(pendingAction.movementType.id);
        toast.success(`El tipo "${pendingAction.movementType.name}" fue desactivado.`);
      } else {
        await activateMovementType(pendingAction.movementType.id);
        toast.success(`El tipo "${pendingAction.movementType.name}" fue activado.`);
      }
      setPendingAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: TableColumn<MovementType>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (t) => <span className="font-medium text-text-primary">{t.name}</span>,
    },
    {
      key: 'purpose',
      header: 'Propósito',
      cell: (t) =>
        t.purpose ? (
          <Badge variant="info">{PURPOSE_LABEL[t.purpose]}</Badge>
        ) : (
          <span className="text-text-disabled">—</span>
        ),
    },
    {
      key: 'description',
      header: 'Descripción',
      cell: (t) => (
        <span className="text-text-tertiary">{t.description ?? '—'}</span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Actualizado',
      cell: (t) => <span className="text-text-tertiary">{formatDateShort(t.updated_at)}</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (t) => (
        <Badge variant={t.is_active ? 'success' : 'neutral'}>
          {t.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && (
            <button
              onClick={() => openEdit(t)}
              className="p-2 rounded-lg text-text-muted hover:text-brand-600 hover:bg-surface-tertiary transition-colors"
              title="Editar tipo"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canSetActive && (
            <button
              onClick={() =>
                setPendingAction({ type: t.is_active ? 'deactivate' : 'activate', movementType: t })
              }
              className={`p-2 rounded-lg transition-colors ${
                t.is_active
                  ? 'text-text-muted hover:text-semantic-danger-600 hover:bg-surface-tertiary'
                  : 'text-text-muted hover:text-semantic-success-600 hover:bg-surface-tertiary'
              }`}
              title={t.is_active ? 'Desactivar tipo' : 'Activar tipo'}
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
        <CardTitle>Tipos de Movimiento</CardTitle>
        {canCreate && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nuevo Tipo
          </Button>
        )}
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <Table
          columns={columns}
          data={movementTypes}
          rowKey={(t) => t.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<Tags className="h-12 w-12" />}
              title="No hay tipos de movimiento"
              description="Crea motivos como compra, venta, ajuste o transferencia para clasificar tus movimientos."
              action={canCreate ? <Button onClick={openCreate}>+ Nuevo Tipo</Button> : undefined}
            />
          }
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar Tipo de Movimiento' : 'Nuevo Tipo de Movimiento'}
        subtitle="El tipo es el motivo del movimiento; la dirección surge de los almacenes."
        size="md"
        disableBackdropClose={isSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" form="movement-type-form" isLoading={isSaving}>
              {editing ? 'Guardar cambios' : 'Crear tipo'}
            </Button>
          </>
        }
      >
        <form id="movement-type-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Nombre"
            placeholder="Ej: Transferencia entre almacenes"
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }));
              if (formError) setFormError(undefined);
            }}
            error={formError}
            required
            maxLength={200}
          />
          <Textarea
            label="Descripción"
            placeholder="Detalle opcional"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
          <Select
            label="Propósito"
            value={form.purpose}
            onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
            options={PURPOSE_OPTIONS}
            helperText="Resérvalo si un proceso automático lo usa (ventas o compras). A lo sumo uno por propósito."
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isActionLoading}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        title={pendingAction?.type === 'deactivate' ? 'Desactivar tipo' : 'Activar tipo'}
        message={
          pendingAction?.type === 'deactivate'
            ? `¿Desactivar "${pendingAction.movementType.name}"? No podrá usarse en movimientos nuevos, pero conserva su historial.`
            : `¿Activar "${pendingAction?.movementType.name}"? Volverá a estar disponible para clasificar movimientos.`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
