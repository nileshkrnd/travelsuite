import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductTypeCode } from "@/types";
import { products as seedProducts } from "@/mock/data/products";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewProductInput {
  code: string;
  name: string;
  country: string;
  city: string;
  supplierId: string;
  productType: ProductTypeCode;
}

interface ProductsState {
  products: Product[];
  addProduct: (input: NewProductInput) => Product;
  updateProduct: (
    id: string,
    patch: Partial<
      Pick<Product, "code" | "name" | "country" | "city" | "supplierId" | "productType" | "status">
    >
  ) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set) => ({
      products: seedProducts,

      addProduct: (input) => {
        const product: Product = {
          id: `product_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          code: input.code,
          name: input.name,
          country: input.country,
          city: input.city,
          supplierId: input.supplierId,
          productType: input.productType,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ products: [...state.products, product] }));
        return product;
      },

      updateProduct: (id, patch) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
      },
    }),
    { name: "travelsuite.products", version: 1 }
  )
);
