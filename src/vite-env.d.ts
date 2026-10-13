/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** URL base de la API de Agabo Backend (opcional; por defecto usa el proxy /api). */
  readonly VITE_API_URL?: string;
  /** Client ID de Google OAuth (mismo valor que GOOGLE_CLIENT_ID del backend). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
