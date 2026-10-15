import { useCallback, useState } from 'react';
import { useRepositories } from '@/application/providers/RepositoryProvider';
import type { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '@/domain/models';
import type { CustomerQueryParams } from '@/domain/repositories';

/**
 * Clientes (sales.customer).
 *
 * El estado vive en el hook (igual que proveedores/almacenes): cada página
 * filtra por búsqueda y estado según lo que esté viendo el usuario.
 * No se eliminan: se activan/desactivan.
 */
export function useCustomers() {
  const { customers: customerRepo } = useRepositories();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (params?: CustomerQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await customerRepo.getAll(params);
      setCustomers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setIsLoading(false);
    }
  }, [customerRepo]);

  const getCustomer = useCallback(async (id: string) => {
    return customerRepo.getById(id);
  }, [customerRepo]);

  const createCustomer = useCallback(async (data: CreateCustomerDTO) => {
    const customer = await customerRepo.create(data);
    setCustomers((prev) => [...prev, customer]);
    return customer;
  }, [customerRepo]);

  const updateCustomer = useCallback(async (id: string, data: UpdateCustomerDTO) => {
    const customer = await customerRepo.update(id, data);
    setCustomers((prev) => prev.map((c) => (c.id === id ? customer : c)));
    return customer;
  }, [customerRepo]);

  const activateCustomer = useCallback(async (id: string) => {
    const customer = await customerRepo.setActive(id);
    setCustomers((prev) => prev.map((c) => (c.id === id ? customer : c)));
    return customer;
  }, [customerRepo]);

  const deactivateCustomer = useCallback(async (id: string) => {
    const customer = await customerRepo.setInactive(id);
    setCustomers((prev) => prev.map((c) => (c.id === id ? customer : c)));
    return customer;
  }, [customerRepo]);

  return {
    customers,
    isLoading,
    error,
    fetchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    activateCustomer,
    deactivateCustomer,
  };
}
