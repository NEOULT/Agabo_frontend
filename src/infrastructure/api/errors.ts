import type { AxiosError } from 'axios';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/**
 * Error normalizado de la API. El backend siempre responde
 * `{ error: { code, message, details } }`; este tipo expone ese contrato.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    code: string,
    status: number,
    details: NonNullable<ApiErrorBody['error']>['details'] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details ?? [];
  }
}

/** Convierte un error de axios (o cualquiera) en ApiError con el mensaje del backend. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const body = axiosError.response?.data;
    const status = axiosError.response?.status ?? 0;

    return new ApiError(
      body?.error?.message ?? 'No se pudo conectar con el servidor.',
      body?.error?.code ?? 'network_error',
      status,
      body?.error?.details,
    );
  }

  return new ApiError(
    error instanceof Error ? error.message : 'Error inesperado',
    'unexpected_error',
    0,
  );
}
