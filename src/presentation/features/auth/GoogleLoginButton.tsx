import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize(options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
            },
          ): void;
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleLoginButtonProps {
  clientId: string;
  /** Recibe el ID token (credential) de Google para enviarlo al backend. */
  onSuccess: (credential: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/**
 * Botón oficial de "Continuar con Google" (Google Identity Services).
 * Carga el script de GIS una sola vez y renderiza el botón en un div.
 */
export function GoogleLoginButton({ clientId, onSuccess, onError, disabled }: GoogleLoginButtonProps) {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Evita closures obsoletos: el callback de GIS se registra una sola vez.
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!clientId || !buttonContainerRef.current) {
      return;
    }

    const renderButton = () => {
      const google = window.google?.accounts?.id;
      if (!google || !buttonContainerRef.current) {
        return;
      }

      google.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onSuccessRef.current(response.credential);
          } else {
            onErrorRef.current?.('No se recibió la credencial de Google.');
          }
        },
      });

      google.renderButton(buttonContainerRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', renderButton);
      return () => existingScript.removeEventListener('load', renderButton);
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    script.onerror = () => onErrorRef.current?.('No se pudo cargar Google Sign-In.');
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId]);

  if (!clientId) {
    return null;
  }

  return (
    <div
      ref={buttonContainerRef}
      className={`flex justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      aria-label="Continuar con Google"
    />
  );
}
