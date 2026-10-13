import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { tokenStorage } from './tokenStorage';

/** URL base de la API. En desarrollo se usa el proxy de Vite (`/api`). */
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

/** Configuración de axios con marca para reintentar una vez tras refrescar el token. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Access token en memoria: el refresh token vive en tokenStorage y el access
 * se refresca solo al cargar la app o ante un 401.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Refresco single-flight: el refresh token del backend es de un solo uso
 * (rotación), así que varias peticiones simultáneas deben compartir la misma
 * promesa de refresco en lugar de consumir el token cada una por su lado.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    // Petición cruda (sin interceptores) para evitar bucles.
    const { data } = await axios.post(
      `${baseURL}/auth/refresh`,
      { session_refresh_text: refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );

    setAccessToken(data.access_token);
    tokenStorage.setRefreshToken(data.session_refresh_text);
    return true;
  } catch {
    // Refresh inválido o expirado: no hay sesión.
    setAccessToken(null);
    tokenStorage.clear();
    return false;
  }
}

export function ensureFreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthRoute = config?.url?.includes('/auth/') ?? false;

    // Reintenta una sola vez tras refrescar el token (excepto en rutas de auth,
    // donde un 401 significa credenciales inválidas, no token vencido).
    if (error.response?.status === 401 && config && !config._retry && !isAuthRoute) {
      const refreshed = await ensureFreshSession();

      if (refreshed) {
        config._retry = true;
        return api(config);
      }
    }

    return Promise.reject(error);
  },
);
