/** Respuesta paginada estándar del API */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Parámetros de paginación para listados */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Parámetros de búsqueda genéricos */
export interface SearchParams {
  search?: string;
}

/** Resultado de una operación asíncrona */
export type AsyncResult<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
