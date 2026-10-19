import React from 'react';
import { EmptyState } from '@/presentation/components/shared/EmptyState';

export interface TableColumn<T> {
  /** Clave única de la columna (y campo por defecto de la fila). */
  key: string;
  header: string;
  /** Renderizado personalizado de la celda. Si se omite, muestra row[key]. */
  cell?: (row: T) => React.ReactNode;
  /** Alineación del contenido (por defecto izquierda). */
  align?: 'left' | 'center' | 'right';
  /** Clases adicionales para la celda (ej: ancho fijo). */
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** Se dispara al hacer clic en una fila (para navegar al detalle). */
  onRowClick?: (row: T) => void;
  /** Contenido que se muestra debajo de la fila cuando está expandida. */
  expandedRow?: (row: T) => React.ReactNode;
  /** Indica si la fila debe mostrar su contenido expandido. */
  isRowExpanded?: (row: T) => boolean;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  expandedRow,
  isRowExpanded,
  isLoading = false,
  emptyState,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-text-tertiary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState ?? <EmptyState title="No hay registros" description="No se encontraron resultados." />}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-secondary">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider ${alignStyles[column.align ?? 'left']} ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.map((row) => (
            <React.Fragment key={rowKey(row)}>
              <tr
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${onRowClick ? 'hover:bg-surface-secondary cursor-pointer' : ''}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-sm ${alignStyles[column.align ?? 'left']} ${column.className ?? ''}`}
                  >
                    {column.cell
                      ? column.cell(row)
                      : String((row as Record<string, unknown>)[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
              {expandedRow && isRowExpanded?.(row) && (
                <tr className="bg-surface-secondary/50">
                  <td colSpan={columns.length} className="px-4 py-3">
                    {expandedRow(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
