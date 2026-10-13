import { create } from 'zustand';
import type { Product, ProductStock } from '@/domain/models';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  stockByBranch: ProductStock[];
  total: number;
  isLoading: boolean;
  error: string | null;

  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setStockByBranch: (stock: ProductStock[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  setTotal: (total: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  selectedProduct: null,
  stockByBranch: [],
  total: 0,
  isLoading: false,
  error: null,

  setProducts: (products) => set({ products }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setStockByBranch: (stockByBranch) => set({ stockByBranch }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (product) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === product.id ? product : p)),
    })),
  removeProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
  setTotal: (total) => set({ total }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
