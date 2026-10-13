import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShoppingBag, User } from 'lucide-react';
import { Button } from '@/presentation/components/ui/Button';
import { Input } from '@/presentation/components/ui/Input';
import { Card } from '@/presentation/components/ui/Card';
import { useAuth } from '@/application/hooks/useAuth';
import { GoogleLoginButton } from './GoogleLoginButton';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    (location.state as { message?: string } | null)?.message ?? null,
  );
  const [googleLoading, setGoogleLoading] = useState(false);

  // El aviso (ej: "contraseña actualizada") se muestra una sola vez.
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!identifier || !password) {
      setError('Por favor ingresa tu usuario y contraseña');
      return;
    }

    try {
      await login({ identifier, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError(null);
    setGoogleLoading(true);

    try {
      await loginWithGoogle(credential);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-surface-primary to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-600 shadow-lg shadow-brand-200 mb-4">
            <ShoppingBag className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Agabo</h1>
          <p className="mt-2 text-text-tertiary">Sistema de Inventario</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Usuario o correo"
              type="text"
              placeholder="admin"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="username"
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-secondary">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border-input bg-surface-primary px-3 py-2 pr-10 text-sm transition-colors placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {notice && (
              <div className="bg-semantic-success-50 border border-semantic-success-200 rounded-lg p-3">
                <p className="text-sm text-semantic-success-700">{notice}</p>
              </div>
            )}

            {error && (
              <div className="bg-semantic-danger-50 border border-semantic-danger-200 rounded-lg p-3">
                <p className="text-sm text-semantic-danger-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Login con Google */}
          {GOOGLE_CLIENT_ID && (
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <p className="text-xs text-text-muted text-center mb-3">
                o continúa con
              </p>
              {googleLoading ? (
                <div className="flex justify-center py-2">
                  <svg className="animate-spin h-5 w-5 text-text-tertiary" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
              ) : (
                <GoogleLoginButton
                  clientId={GOOGLE_CLIENT_ID}
                  onSuccess={handleGoogleSuccess}
                  onError={(message) => setError(message)}
                  disabled={isLoading}
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
