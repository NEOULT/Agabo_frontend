import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Card } from '@/presentation/components/ui/Card';
import { useAuth } from '@/application/hooks/useAuth';

/**
 * Política de contraseña del backend (RN-SEC-004): mínimo 8 caracteres,
 * una mayúscula, una minúscula y un símbolo.
 */
const PASSWORD_POLICY = {
  minLength: 8,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).+$/,
};

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_POLICY.minLength) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (!PASSWORD_POLICY.pattern.test(password)) {
    return 'La contraseña debe incluir una mayúscula, una minúscula y un símbolo';
  }
  return null;
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, isLoading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación local antes de llamar al backend
    const errors: typeof fieldErrors = {};

    if (!currentPassword) {
      errors.current = 'Ingresa tu contraseña actual';
    }

    const policyError = validatePassword(newPassword);
    if (policyError) {
      errors.next = policyError;
    }

    if (newPassword !== confirmPassword) {
      errors.confirm = 'Las contraseñas no coinciden';
    }

    if (newPassword && newPassword === currentPassword) {
      errors.next = 'La contraseña nueva debe ser distinta de la actual';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      // La sesión fue revocada por el backend: volver al login con un aviso.
      navigate('/login', {
        state: { message: 'Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.' },
      });
    } catch (err) {
      // Errores del backend: contraseña actual incorrecta, política, etc.
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-border-input bg-surface-primary px-3 py-2 pr-10 text-sm transition-colors placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-200 mb-3">
          <KeyRound className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Cambiar contraseña</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Se cerrarán todas tus sesiones después del cambio
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Contraseña actual <span className="text-semantic-danger-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            {fieldErrors.current && (
              <p className="text-sm text-semantic-danger-600">{fieldErrors.current}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Contraseña nueva <span className="text-semantic-danger-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            {fieldErrors.next && (
              <p className="text-sm text-semantic-danger-600">{fieldErrors.next}</p>
            )}
            {!fieldErrors.next && (
              <p className="text-xs text-text-tertiary">
                Mínimo 8 caracteres, con una mayúscula, una minúscula y un símbolo
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-secondary">
              Confirmar contraseña nueva <span className="text-semantic-danger-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-secondary"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirm && (
              <p className="text-sm text-semantic-danger-600">{fieldErrors.confirm}</p>
            )}
          </div>

          {error && (
            <div className="bg-semantic-danger-50 border border-semantic-danger-200 rounded-lg p-3">
              <p className="text-sm text-semantic-danger-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={isLoading}
            >
              Actualizar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
