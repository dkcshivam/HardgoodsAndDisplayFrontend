"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, query, type Paginated } from "@/lib/api";
import type {
  BoxType,
  Category,
  Merchant,
  Order,
  PackingPlan,
  Product,
  ProductGroup,
  ProductListItem,
} from "@/types";

type Filters = Record<string, string | number | boolean | undefined>;

function useList<T>(
  resource: string,
  filters: Filters = {},
  options?: Partial<UseQueryOptions<Paginated<T>>>,
) {
  return useQuery<Paginated<T>>({
    queryKey: [resource, filters],
    queryFn: () => api.get<Paginated<T>>(`/${resource}/${query(filters)}`),
    ...options,
  });
}

export const useBoxTypes = (filters?: Filters) =>
  useList<BoxType>("box-types", filters);
export const useCategories = (filters?: Filters) =>
  useList<Category>("categories", filters);
export const useProductGroups = (filters?: Filters) =>
  useList<ProductGroup>("product-groups", filters);
export const useMerchants = (filters?: Filters) =>
  useList<Merchant>("merchants", filters);
export const useProducts = (filters?: Filters) =>
  useList<ProductListItem>("products", filters);
export const useOrders = (filters?: Filters) => useList<Order>("orders", filters);

export const useProduct = (id: number | null) =>
  useQuery({
    queryKey: ["products", id],
    queryFn: () => api.get<Product>(`/products/${id}/`),
    enabled: id !== null,
  });

export const useOrder = (id: number) =>
  useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get<Order>(`/orders/${id}/`),
  });

export const usePackingPlan = (orderId: number) =>
  useQuery({
    queryKey: ["orders", orderId, "packing"],
    queryFn: () => api.get<PackingPlan>(`/orders/${orderId}/packing/`),
  });

/**
 * Create/update/delete for one resource. Every mutation invalidates the
 * resource's whole key, so lists and detail views refresh together.
 */
export function useSave<T extends { id?: number }>(resource: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (record: T) =>
      record.id
        ? api.put<T>(`/${resource}/${record.id}/`, record)
        : api.post<T>(`/${resource}/`, record),
    onSuccess: () => client.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useRemove(resource: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/${resource}/${id}/`),
    onSuccess: () => client.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useOrderAction(orderId: number) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["orders"] });

  return {
    autoPack: useMutation({
      mutationFn: () => api.post<PackingPlan>(`/orders/${orderId}/auto-pack/`),
      onSuccess: refresh,
    }),
    savePacking: useMutation({
      mutationFn: (cartons: unknown[]) =>
        api.put<PackingPlan>(`/orders/${orderId}/packing/`, { cartons }),
      onSuccess: refresh,
    }),
    advance: useMutation({
      mutationFn: () => api.post<Order>(`/orders/${orderId}/advance-status/`),
      onSuccess: refresh,
    }),
  };
}
