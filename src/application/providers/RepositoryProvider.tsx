import React, { createContext, useContext } from 'react';
import type {
  IProductRepository,
  ISupplierRepository,
  IBranchRepository,
  IWarehouseRepository,
  ILocationRepository,
  IMovementRepository,
  IAuthRepository,
} from '@/domain/repositories';

import { MockProductRepository } from '@/infrastructure/mocks/repositories/MockProductRepository';
import { MockMovementRepository } from '@/infrastructure/mocks/repositories/MockMovementRepository';
import { ApiAuthRepository } from '@/infrastructure/api/ApiAuthRepository';
import { ApiBranchRepository } from '@/infrastructure/api/ApiBranchRepository';
import { ApiWarehouseRepository } from '@/infrastructure/api/ApiWarehouseRepository';
import { ApiLocationRepository } from '@/infrastructure/api/ApiLocationRepository';
import { ApiSupplierRepository } from '@/infrastructure/api/ApiSupplierRepository';

export interface Repositories {
  products: IProductRepository;
  suppliers: ISupplierRepository;
  branches: IBranchRepository;
  warehouses: IWarehouseRepository;
  locations: ILocationRepository;
  movements: IMovementRepository;
  auth: IAuthRepository;
}

/**
 * Auth, company (branches/warehouses/locations) y suppliers ya consumen el
 * backend Express real. El resto sigue con Mock hasta conectar sus módulos.
 */
const repositories: Repositories = {
  products: new MockProductRepository(),
  suppliers: new ApiSupplierRepository(),
  branches: new ApiBranchRepository(),
  warehouses: new ApiWarehouseRepository(),
  locations: new ApiLocationRepository(),
  movements: new MockMovementRepository(),
  auth: new ApiAuthRepository(),
};

const RepoContext = createContext<Repositories>(repositories);

export function useRepositories(): Repositories {
  return useContext(RepoContext);
}

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  return (
    <RepoContext.Provider value={repositories}>
      {children}
    </RepoContext.Provider>
  );
}
