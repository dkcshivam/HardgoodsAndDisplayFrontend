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
  DisplayCarton,
  DisplayOrder,
  DisplayPackingPlan,
  DisplayProduct,
  Merchant,
  Order,
  PackingPlan,
  PackTemplate,
  Product,
  ProductImage,
  ProductListItem,
  Store,
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
export const useStores = (filters?: Filters) => useList<Store>("stores", filters);
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
export function usePhotoActions(
  // Display keeps its own products and photo endpoint; the shape is identical.
  resource = "product-images",
  owner = "products",
) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: [owner] });

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
        return api.post<ProductImage>(`/${resource}/`, body);
      },
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api.delete<void>(`/${resource}/${id}/`),
      onSuccess: refresh,
    }),
    setMain: useMutation({
      mutationFn: (id: number) =>
        api.patch<ProductImage>(`/${resource}/${id}/`, { is_main: true }),
      onSuccess: refresh,
    }),
  };
}

/** The Display module's own photo endpoint. */
export const useDisplayPhotoActions = () =>
  usePhotoActions("display-product-images", "display-products");

export function useRemove(resource: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/${resource}/${id}/`),
    onSuccess: () => client.invalidateQueries({ queryKey: [resource] }),
  });
}

/* ── Display ──────────────────────────────────────────────────────── */

export const useDisplayProducts = (filters?: Filters) =>
  useList<DisplayProduct>("display-products", filters);
export const usePackTemplates = (filters?: Filters) =>
  useList<PackTemplate>("pack-templates", filters);
export const useDisplayOrders = (filters?: Filters) =>
  useList<DisplayOrder>("display-orders", filters);

export const useDisplayProduct = (id: number | null) =>
  useQuery({
    queryKey: ["display-products", id],
    queryFn: () => api.get<DisplayProduct>(`/display-products/${id}/`),
    enabled: id !== null,
  });

export const useDisplayOrder = (id: number) =>
  useQuery({
    queryKey: ["display-orders", id],
    queryFn: () => api.get<DisplayOrder>(`/display-orders/${id}/`),
  });

/**
 * Without a store this is the order overview; with one it is that store's
 * plan. A box design only means something inside a single store, so the
 * templates that fit are only returned once a store is named.
 */
export const useDisplayPackingPlan = (
  orderId: number,
  storeId: number | null = null,
  options?: Partial<UseQueryOptions<DisplayPackingPlan>>,
) =>
  useQuery<DisplayPackingPlan>({
    queryKey: ["display-orders", orderId, "packing", storeId],
    queryFn: () =>
      api.get<DisplayPackingPlan>(
        `/display-orders/${orderId}/packing/${query({ store: storeId ?? undefined })}`,
      ),
    ...options,
  });

/** The full design behind a row of `applicable_templates`, for editing it. */
export const usePackTemplate = (id: number | null) =>
  useQuery({
    queryKey: ["pack-templates", id],
    queryFn: () => api.get<PackTemplate>(`/pack-templates/${id}/`),
    enabled: id !== null,
  });

/**
 * The boxes, separately from the plan. `packing/` deliberately omits them —
 * a finished order runs to thousands and the screen works in steps.
 */
export const useDisplayCartons = (
  orderId: number,
  step: number | null,
) =>
  useQuery({
    queryKey: ["display-orders", orderId, "cartons", step],
    queryFn: () =>
      api.get<Paginated<DisplayCarton>>(
        `/display-orders/${orderId}/cartons/${query({ step: step ?? undefined })}`,
      ),
    enabled: step !== null,
  });

export function useDisplayOrderAction(orderId: number, storeId: number | null) {
  const client = useQueryClient();
  const planKey = ["display-orders", orderId, "packing", storeId];
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["display-orders"] });

  /**
   * A step mutation's response IS the fresh plan — write it straight into the
   * cache instead of only invalidating and waiting on a separate refetch.
   * Without this, a just-typed value sits in a gap where the cache still
   * holds the pre-edit plan and briefly flashes back to it.
   */
  const onStepChange = (plan: DisplayPackingPlan) => {
    client.setQueryData(planKey, plan);
    refresh();
  };

  return {
    applyStep: useMutation({
      mutationFn: ({
        template,
        store,
        count,
      }: {
        template: number;
        store: number;
        count?: number;
      }) =>
        api.post<DisplayPackingPlan>(`/display-orders/${orderId}/steps/`, {
          template,
          store,
          ...(count === undefined ? {} : { count }),
        }),
      onSuccess: onStepChange,
    }),
    // The store rides on the query string so the replayed plan comes back
    // scoped the same way the screen is showing it.
    recountStep: useMutation({
      mutationFn: ({ sequence, count }: { sequence: number; count: number }) =>
        api.patch<DisplayPackingPlan>(
          `/display-orders/${orderId}/steps/${sequence}/${query({ store: storeId ?? undefined })}`,
          { count },
        ),
      onSuccess: onStepChange,
    }),
    deleteStep: useMutation({
      mutationFn: (sequence: number) =>
        api.delete<DisplayPackingPlan>(
          `/display-orders/${orderId}/steps/${sequence}/${query({ store: storeId ?? undefined })}`,
        ),
      onSuccess: onStepChange,
    }),
    replicatePlan: useMutation({
      mutationFn: (store: number) =>
        api.post<DisplayPackingPlan>(`/display-orders/${orderId}/replicate/`, {
          store,
        }),
      onSuccess: onStepChange,
    }),
    advance: useMutation({
      mutationFn: () =>
        api.post<DisplayOrder>(`/display-orders/${orderId}/advance-status/`),
      onSuccess: refresh,
    }),
    downloadPackingList: useMutation({
      mutationFn: (orderNumber: string) =>
        api.download(
          `/display-orders/${orderId}/packing-list/`,
          `packing-list-${orderNumber}.xlsx`,
        ),
    }),
  };
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
