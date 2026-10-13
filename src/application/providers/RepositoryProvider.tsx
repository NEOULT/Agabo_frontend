import React, { createContext, useContext } from 'react';
import type {
  IProductRepository,
  ISupplierRepository,
  IBranchRepository,
  IMovementRepository,
  IAuthRepository,
} from '@/domain/repositories';

import { MockProductRepository } from '@/infrastructure/mocks/repositories/MockProductRepository';
import { MockSupplierRepository } from '@/infrastructure/mocks/repositories/MockSupplierRepository';
import { MockBranchRepository } from '@/infrastructure/mocks/repositories/MockBranchRepository';
import { MockMovementRepository } from '@/infrastructure/mocks/repositories/MockMovementRepository';
import { ApiAuthRepository } from '@/infrastructure/api/ApiAuthRepository';

export interface Repositories {
  products: IProductRepository;
  suppliers: ISupplierRepository;
  branches: IBranchRepository;
  movements: IMovementRepository;
  auth: IAuthRepository;
}

/**
 * Auth ya consume el backend Express real (login, Google y refresh).
 * El resto de los repositorios sigue con implementaciones Mock hasta
 * conectar sus módulos.
 */
const repositories: Repositories = {
  products: new MockProductRepository(),
  suppliers: new MockSupplierRepository(),
  branches: new MockBranchRepository(),
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
