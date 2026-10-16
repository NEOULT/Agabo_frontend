import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Currency } from '@/domain/models';
import type { CurrencyQueryParams } from '@/domain/repositories';

/** Monedas (company.currency): catálogo global de solo lectura. */
export function useCurrencies() {
  const { currencies: currencyRepo } = useRepositories();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrencies = useCallback(
    async (params?: CurrencyQueryParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await currencyRepo.getAll(params);
        setCurrencies(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar monedas');
      } finally {
        setIsLoading(false);
      }
    },
    [currencyRepo],
  );

  return { currencies, isLoading, error, fetchCurrencies };
}
