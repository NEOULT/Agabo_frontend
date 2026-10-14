import React from 'react';
import { Button } from '@/presentation/components/ui/Button';
import { Modal } from '@/presentation/components/ui/Modal';
import { Input } from '@/presentation/components/ui/Input';
import { PASSWORD_POLICY, isStrongPassword } from '@/shared/utils/validations';
import type { SecurityUser } from '@/domain/models';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SecurityUser | null;
  /** PATCH /api/users/{id}/password — revoca las sesiones del usuario. */
  onSubmit: (password: string) => Promise<void>;
}

/**
 * Restablecimiento de la contraseña de un usuario por su administrador
 * (RF-SEC-005): no se pide la contraseña anterior y el usuario debe cambiarla
 * después, porque la operación revoca todas sus sesiones (RN-SEC-019).
 */
export function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onSubmit,
}: ResetPasswordModalProps) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setErrors({});
    setError(null);
  }, [isOpen]);

  const handleSubmit = async () => {
    const nextErrors: { password?: string; confirm?: string } = {};

    const policyError = isStrongPassword(password);
    if (policyError) nextErrors.password = policyError;
    if (password !== confirmPassword) nextErrors.confirm = 'Las contraseñas no coinciden.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restablecer contraseña"
      size="md"
      disableBackdropClose={isSaving}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            Restablecer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-tertiary">
          Se asignará una contraseña nueva a <strong>{displayName}</strong> y se cerrarán todas sus
          sesiones, incluidas las de otros dispositivos.
        </p>

        <Input
          label="Contraseña nueva"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          helperText={PASSWORD_POLICY.hint}
          autoComplete="new-password"
          maxLength={PASSWORD_POLICY.maxLength}
          required
        />

        <Input
          label="Confirmar contraseña"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((prev) => ({ ...prev, confirm: undefined }));
          }}
          error={errors.confirm}
          autoComplete="new-password"
          maxLength={PASSWORD_POLICY.maxLength}
          required
        />

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="h-4 w-4 rounded border-border-input text-brand-600 focus:ring-brand-500"
          />
          Mostrar contraseñas
        </label>

        {error && (
          <div className="rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
