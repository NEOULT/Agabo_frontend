import React from 'react';
import { Coins } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/presentation/components/ui/Card';
import { Badge } from '@/presentation/components/ui/Badge';
import { Table, type TableColumn } from '@/presentation/components/ui/Table';
import { SearchInput } from '@/presentation/components/shared/SearchInput';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { useCurrencies } from '@/application/hooks/useCurrencies';
import type { Currency } from '@/domain/models';

/** La tasa es "unidades de esta moneda por 1 unidad de la base". */
const rateFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 6 });

/**
 * Monedas (company.currency).
 *
 * Catálogo global del sistema. Agabo maneja tres monedas fijas (USD base, VES y
 * EUR): aquí solo se consultan, no se crean ni se editan.
 */
export function CurrencyListPage() {
  const { currencies, isLoading, error, fetchCurrencies } = useCurrencies();
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    fetchCurrencies({ search: search || undefined });
  }, [fetchCurrencies, search]);

  const columns: TableColumn<Currency>[] = [
    {
      key: 'code',
      header: 'Código',
      cell: (c) => <span className="font-medium text-text-primary">{c.code}</span>,
    },
    {
      key: 'name',
      header: 'Nombre',
      cell: (c) => <span className="text-text-secondary">{c.name}</span>,
    },
    {
      key: 'symbol',
      header: 'Símbolo',
      cell: (c) => <span className="text-text-secondary">{c.symbol}</span>,
    },
    {
      key: 'decimals',
      header: 'Decimales',
      align: 'center',
      cell: (c) => <span className="text-text-secondary">{c.decimals}</span>,
    },
    {
      key: 'exchange_rate',
      header: 'Tasa (por 1 $)',
      align: 'right',
      cell: (c) => (
        <span className="tabular-nums text-text-secondary">
          {rateFormatter.format(c.exchange_rate)}
        </span>
      ),
    },
    {
      key: 'is_base',
      header: 'Base',
      align: 'center',
      cell: (c) =>
        c.is_base ? <Badge variant="success">Base</Badge> : <span className="text-text-muted">—</span>,
    },
    {
      key: 'is_active',
      header: 'Estado',
      align: 'center',
      cell: (c) => (
        <Badge variant={c.is_active ? 'success' : 'neutral'}>
          {c.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <CardHeader>
        <CardTitle>Monedas</CardTitle>
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-semantic-danger-200 bg-semantic-danger-50 px-4 py-3 text-sm text-semantic-danger-700">
          {error}
        </div>
      )}

      <Card padding="none">
        <div className="p-4 border-b border-border-subtle max-w-md">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre..." />
        </div>

        <Table
          columns={columns}
          data={currencies}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<Coins className="h-12 w-12" />}
              title={search ? 'Sin resultados' : 'No hay monedas'}
              description={
                search
                  ? 'No se encontraron monedas que coincidan con la búsqueda.'
                  : 'El catálogo de monedas del sistema aún no está cargado.'
              }
            />
          }
        />
      </Card>
    </div>
  );
}
