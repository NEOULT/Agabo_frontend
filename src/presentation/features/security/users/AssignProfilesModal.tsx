import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Modal } from '@/presentation/components/ui/Modal';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import type { Profile, SecurityUser } from '@/domain/models';

interface AssignProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Usuario al que se le reemplazan los perfiles. */
  user: SecurityUser | null;
  /** Perfiles activos de la empresa. */
  profiles: Profile[];
  /** PUT /api/users/{id}/profiles — la lista enviada es la completa. */
  onSubmit: (profileIds: string[]) => Promise<void>;
}

/**
 * Asigna perfiles a un usuario (RF-SEC-019).
 *
 * El backend reemplaza el conjunto completo de `security.user_profile`, así
 * que se envía exactamente lo marcado: los perfiles desmarcados quedan
 * desasignados.
 */
export function AssignProfilesModal({
  isOpen,
  onClose,
  user,
  profiles,
  onSubmit,
}: AssignProfilesModalProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Al abrir, se marca lo que el usuario ya tiene asignado
  React.useEffect(() => {
    if (!isOpen || !user) return;
    setSelected(user.profiles.map((profile) => profile.profile_uuid));
    setError(null);
  }, [isOpen, user]);

  const toggle = (profileId: string) => {
    setSelected((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId],
    );
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron asignar los perfiles.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfiles del usuario"
      size="lg"
      disableBackdropClose={isSaving}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            Guardar perfiles
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-tertiary">
          Los permisos del usuario son la unión de sus perfiles activos. Un usuario sin perfiles
          puede iniciar sesión, pero no autoriza ninguna operación protegida.
        </p>

        {profiles.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-10 w-10" />}
            title="No hay perfiles activos"
            description="Crea un perfil y asígnale permisos antes de asignarlo a un usuario."
          />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {profiles.map((profile) => (
              <label
                key={profile.id}
                className="flex items-start gap-3 rounded-lg border border-border-subtle p-3 hover:bg-surface-secondary cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(profile.id)}
                  onChange={() => toggle(profile.id)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 rounded border-border-input text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text-primary">
                    {profile.name}
                    {profile.is_system && (
                      <span className="ml-2 text-xs font-normal text-text-tertiary">
                        (perfil de sistema)
                      </span>
                    )}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <p className="text-xs text-text-tertiary">
          Perfiles seleccionados: {selected.length} de {profiles.length}.
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
