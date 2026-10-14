import React, { createContext, useContext } from 'react';
import type {
  IProductRepository,
  IUnitRepository,
  ICategoryRepository,
  IBrandRepository,
  ISupplierRepository,
  IPurchaseOrderRepository,
  IPurchaseReceiptRepository,
  IBranchRepository,
  IWarehouseRepository,
  ILocationRepository,
  IMovementRepository,
  IAuthRepository,
  IUserRepository,
  IProfileRepository,
  IAuthorizationCatalogRepository,
} from '@/domain/repositories';

import { MockMovementRepository } from '@/infrastructure/mocks/repositories/MockMovementRepository';
import { ApiAuthRepository } from '@/infrastructure/api/ApiAuthRepository';
import { ApiBranchRepository } from '@/infrastructure/api/ApiBranchRepository';
import { ApiWarehouseRepository } from '@/infrastructure/api/ApiWarehouseRepository';
import { ApiLocationRepository } from '@/infrastructure/api/ApiLocationRepository';
import { ApiSupplierRepository } from '@/infrastructure/api/ApiSupplierRepository';
import { ApiPurchaseOrderRepository } from '@/infrastructure/api/ApiPurchaseOrderRepository';
import { ApiPurchaseReceiptRepository } from '@/infrastructure/api/ApiPurchaseReceiptRepository';
import { ApiProductRepository } from '@/infrastructure/api/ApiProductRepository';
import { ApiUnitRepository } from '@/infrastructure/api/ApiUnitRepository';
import { ApiCategoryRepository } from '@/infrastructure/api/ApiCategoryRepository';
import { ApiBrandRepository } from '@/infrastructure/api/ApiBrandRepository';
import { ApiUserRepository } from '@/infrastructure/api/ApiUserRepository';
import { ApiProfileRepository } from '@/infrastructure/api/ApiProfileRepository';
import { ApiAuthorizationCatalogRepository } from '@/infrastructure/api/ApiAuthorizationCatalogRepository';

export interface Repositories {
  products: IProductRepository;
  units: IUnitRepository;
  categories: ICategoryRepository;
  brands: IBrandRepository;
  suppliers: ISupplierRepository;
  purchaseOrders: IPurchaseOrderRepository;
  purchaseReceipts: IPurchaseReceiptRepository;
  branches: IBranchRepository;
  warehouses: IWarehouseRepository;
  locations: ILocationRepository;
  movements: IMovementRepository;
  auth: IAuthRepository;
  users: IUserRepository;
  profiles: IProfileRepository;
  authorizationCatalog: IAuthorizationCatalogRepository;
}

/**
 * Auth, company (branches/warehouses/locations), purchases.suppliers y el
 * catálogo (products/units/categories/brands) ya consumen el backend Express
 * real. Solo movements sigue con Mock hasta conectar el módulo inventory.
 */
const repositories: Repositories = {
  products: new ApiProductRepository(),
  units: new ApiUnitRepository(),
  categories: new ApiCategoryRepository(),
  brands: new ApiBrandRepository(),
  suppliers: new ApiSupplierRepository(),
  purchaseOrders: new ApiPurchaseOrderRepository(),
  purchaseReceipts: new ApiPurchaseReceiptRepository(),
  branches: new ApiBranchRepository(),
  warehouses: new ApiWarehouseRepository(),
  locations: new ApiLocationRepository(),
  movements: new MockMovementRepository(),
  auth: new ApiAuthRepository(),
  users: new ApiUserRepository(),
  profiles: new ApiProfileRepository(),
  authorizationCatalog: new ApiAuthorizationCatalogRepository(),
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
