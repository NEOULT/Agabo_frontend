import React, { createContext, useContext } from 'react';
import type {
  IProductRepository,
  IUnitRepository,
  ICategoryRepository,
  IBrandRepository,
  ISupplierRepository,
  IPriceListRepository,
  IPriceProductRepository,
  IPurchaseOrderRepository,
  IPurchaseReceiptRepository,
  ICustomerRepository,
  IPaymentMethodRepository,
  ISaleRepository,
  IPaymentRepository,
  IBranchRepository,
  IWarehouseRepository,
  ICurrencyRepository,
  IMovementRepository,
  IAuthRepository,
  IUserRepository,
  IProfileRepository,
  IAuthorizationCatalogRepository,
  IMovementTypeRepository,
  IStockRepository,
  IScanSessionRepository,
} from '@/domain/repositories';

import { ApiAuthRepository } from '@/infrastructure/api/ApiAuthRepository';
import { ApiBranchRepository } from '@/infrastructure/api/ApiBranchRepository';
import { ApiWarehouseRepository } from '@/infrastructure/api/ApiWarehouseRepository';
import { ApiCurrencyRepository } from '@/infrastructure/api/ApiCurrencyRepository';
import { ApiSupplierRepository } from '@/infrastructure/api/ApiSupplierRepository';
import { ApiPriceListRepository } from '@/infrastructure/api/ApiPriceListRepository';
import { ApiPriceProductRepository } from '@/infrastructure/api/ApiPriceProductRepository';
import { ApiPurchaseOrderRepository } from '@/infrastructure/api/ApiPurchaseOrderRepository';
import { ApiPurchaseReceiptRepository } from '@/infrastructure/api/ApiPurchaseReceiptRepository';
import { ApiCustomerRepository } from '@/infrastructure/api/ApiCustomerRepository';
import { ApiPaymentMethodRepository } from '@/infrastructure/api/ApiPaymentMethodRepository';
import { ApiSaleRepository } from '@/infrastructure/api/ApiSaleRepository';
import { ApiPaymentRepository } from '@/infrastructure/api/ApiPaymentRepository';
import { ApiProductRepository } from '@/infrastructure/api/ApiProductRepository';
import { ApiUnitRepository } from '@/infrastructure/api/ApiUnitRepository';
import { ApiCategoryRepository } from '@/infrastructure/api/ApiCategoryRepository';
import { ApiBrandRepository } from '@/infrastructure/api/ApiBrandRepository';
import { ApiUserRepository } from '@/infrastructure/api/ApiUserRepository';
import { ApiProfileRepository } from '@/infrastructure/api/ApiProfileRepository';
import { ApiAuthorizationCatalogRepository } from '@/infrastructure/api/ApiAuthorizationCatalogRepository';
import { ApiMovementRepository } from '@/infrastructure/api/ApiMovementRepository';
import { ApiMovementTypeRepository } from '@/infrastructure/api/ApiMovementTypeRepository';
import { ApiStockRepository } from '@/infrastructure/api/ApiStockRepository';
import { ApiScanSessionRepository } from '@/infrastructure/api/ApiScanSessionRepository';

export interface Repositories {
  products: IProductRepository;
  units: IUnitRepository;
  categories: ICategoryRepository;
  brands: IBrandRepository;
  suppliers: ISupplierRepository;
  priceLists: IPriceListRepository;
  priceProducts: IPriceProductRepository;
  purchaseOrders: IPurchaseOrderRepository;
  purchaseReceipts: IPurchaseReceiptRepository;
  customers: ICustomerRepository;
  paymentMethods: IPaymentMethodRepository;
  sales: ISaleRepository;
  payments: IPaymentRepository;
  branches: IBranchRepository;
  warehouses: IWarehouseRepository;
  currencies: ICurrencyRepository;
  movements: IMovementRepository;
  movementTypes: IMovementTypeRepository;
  stocks: IStockRepository;
  scanSessions: IScanSessionRepository;
  auth: IAuthRepository;
  users: IUserRepository;
  profiles: IProfileRepository;
  authorizationCatalog: IAuthorizationCatalogRepository;
}

/**
 * Auth, company (branches/warehouses), purchases
 * (suppliers/orders/receipts), sales (customers/payment_methods/sales/payments),
 * el catálogo (products/units/categories/brands) y el inventario
 * (movements/movement types/stocks) consumen el backend Express real.
 */
const repositories: Repositories = {
  products: new ApiProductRepository(),
  units: new ApiUnitRepository(),
  categories: new ApiCategoryRepository(),
  brands: new ApiBrandRepository(),
  suppliers: new ApiSupplierRepository(),
  priceLists: new ApiPriceListRepository(),
  priceProducts: new ApiPriceProductRepository(),
  purchaseOrders: new ApiPurchaseOrderRepository(),
  purchaseReceipts: new ApiPurchaseReceiptRepository(),
  customers: new ApiCustomerRepository(),
  paymentMethods: new ApiPaymentMethodRepository(),
  sales: new ApiSaleRepository(),
  payments: new ApiPaymentRepository(),
  branches: new ApiBranchRepository(),
  warehouses: new ApiWarehouseRepository(),
  currencies: new ApiCurrencyRepository(),
  movements: new ApiMovementRepository(),
  movementTypes: new ApiMovementTypeRepository(),
  stocks: new ApiStockRepository(),
  scanSessions: new ApiScanSessionRepository(),
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
