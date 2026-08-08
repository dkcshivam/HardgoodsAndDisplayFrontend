"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, query, type Paginated } from "@/lib/api";
import type {
  Category,
  Merchant,
  Order,
  PackingPlan,
  Product,
  ProductImage,
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

export const useCategories = (filters?: Filters) =>
  useList<Category>("categories", filters);
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
 *
 * `R` splits the saved shape from the sent one — a form sends a draft and
 * gets the full record back.
 */
export function useSave<T extends { id?: number }, R = T>(resource: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (record: T) =>
      record.id
        ? api.put<R>(`/${resource}/${record.id}/`, record)
        : api.post<R>(`/${resource}/`, record),
    onSuccess: () => client.invalidateQueries({ queryKey: [resource] }),
  });
}

/**
 * Photos upload one file at a time as multipart, against an owner that
 * already exists — a product or part needs an id before a file can point at
 * it. The product form queues them until then.
 */
export function usePhotoActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["products"] });

  return {
    upload: useMutation({
      mutationFn: ({
        file,
        product,
        part,
      }: {
        file: File;
        product?: number;
        part?: number;
      }) => {
        const body = new FormData();
        body.append("image", file);
        if (product) body.append("product", String(product));
        if (part) body.append("part", String(part));
        return api.post<ProductImage>("/product-images/", body);
      },
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api.delete<void>(`/product-images/${id}/`),
      onSuccess: refresh,
    }),
    setMain: useMutation({
      mutationFn: (id: number) =>
        api.patch<ProductImage>(`/product-images/${id}/`, { is_main: true }),
      onSuccess: refresh,
    }),
  };
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
    downloadPackingList: useMutation({
      mutationFn: (orderNumber: string) =>
        api.download(
          `/orders/${orderId}/packing-list/`,
          `packing-list-${orderNumber}.xlsx`,
        ),
    }),
  };
}
