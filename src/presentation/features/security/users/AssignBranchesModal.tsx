import React from 'react';
import { Store } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Modal } from '@/presentation/components/ui/Modal';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import type { Branch, SecurityUser } from '@/domain/models';

interface AssignBranchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Usuario al que se le reemplazan las sucursales. */
  user: SecurityUser | null;
  /** Sucursales de la empresa (activas e inactivas). */
  branches: Branch[];
  /** PUT /api/users/{id}/branches — la lista enviada es la completa. */
  onSubmit: (branchIds: string[]) => Promise<void>;
}

/**
 * Asigna sucursales a un usuario (RF-SEC-020 y RF-SEC-025).
 *
 * El alcance de sucursales viaja en el token, así que el cambio se aplica
 * cuando el usuario renueve la sesión (RN-SEC-013). Un usuario sin sucursales
 * no puede operar sobre registros de sucursal.
 */
export function AssignBranchesModal({
  isOpen,
  onClose,
  user,
  branches,
  onSubmit,
}: AssignBranchesModalProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !user) return;
    setSelected([...user.branches]);
    setError(null);
  }, [isOpen, user]);

  const toggle = (branchId: string) => {
    setSelected((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  };

  const activeBranches = branches.filter((branch) => branch.is_active);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron asignar las sucursales.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedActive = selected.filter((id) =>
    activeBranches.some((branch) => branch.id === id),
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sucursales del usuario"
      size="lg"
      disableBackdropClose={isSaving}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            Guardar sucursales
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-tertiary">
          El usuario solo puede operar sobre las sucursales asignadas. El cambio se aplica en su
          próxima sesión, porque el alcance viaja en el token.
        </p>

        {branches.length === 0 ? (
          <EmptyState
            icon={<Store className="h-10 w-10" />}
            title="No hay sucursales"
            description="Registra al menos una sucursal antes de asignar el alcance de un usuario."
          />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {branches.map((branch) => (
              <label
                key={branch.id}
                className="flex items-start gap-3 rounded-lg border border-border-subtle p-3 hover:bg-surface-secondary cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(branch.id)}
                  onChange={() => toggle(branch.id)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 rounded border-border-input text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text-primary">
                    {branch.name}
                    {!branch.is_active && (
                      <span className="ml-2 text-xs font-normal text-text-tertiary">
                        (inactiva)
                      </span>
                    )}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <p className="text-xs text-text-tertiary">
          Seleccionadas: {selectedActive} activa{selectedActive === 1 ? '' : 's'} de{' '}
          {activeBranches.length}.
        </p>

        {error && (
          <div className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
