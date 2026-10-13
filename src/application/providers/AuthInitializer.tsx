import React from 'react';
import { useAuth } from '@/application/hooks/useAuth';

/**
 * Inicializa la sesión al cargar la app.
 * Sin esto, ProtectedRoute se queda en "Verificando sesión..."
 * porque el store arranca con isLoading: true y nada lo cambia.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  useAuth(); // Dispara el useEffect que checkea la sesión
  return <React.Fragment>{children}</React.Fragment>;
}
