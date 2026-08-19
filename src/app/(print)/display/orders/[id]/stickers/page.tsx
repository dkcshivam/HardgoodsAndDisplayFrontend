"use client";

import { use, useMemo, useState } from "react";
import { Select } from "@/components/ui/input";
import { StickerSheet } from "@/components/packing/sticker-sheet";
import {
  useDisplayOrder,
  useDisplayPackingPlan,
  useDisplayProducts,
  useDisplayStickerCartons,
} from "@/lib/queries";
import { displayStickers } from "@/lib/stickers";

export default function DisplayStickersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);

  // Null prints the whole order; a store id prints that store's pallet, which
  // is how the warehouse actually works through them.
  const [store, setStore] = useState<number | null>(null);

  const order = useDisplayOrder(orderId);
  const plan = useDisplayPackingPlan(orderId, null);
  const cartons = useDisplayStickerCartons(orderId, store);
  const products = useDisplayProducts({ page_size: 1000 });

  const stickers = useMemo(
    () =>
      displayStickers(
        cartons.data?.results ?? [],
        products.data?.results ?? [],
      ),
    [cartons.data, products.data],
  );

  const rows = cartons.data?.results ?? [];

  const stores = plan.data?.stores ?? [];
  const total = cartons.data?.count ?? 0;

  return (
    <StickerSheet
      title={order.data ? `${order.data.number} — box stickers` : "Box stickers"}
      subtitle={order.data?.name ?? ""}
      backHref={`/display/orders/${orderId}/packing`}
      stickers={stickers}
      loading={cartons.isLoading || products.isLoading}
      notice={
        total > rows.length
          ? `${total} boxes on this order — printing the first ${rows.length}. Narrow it to one store.`
          : undefined
      }
      filters={
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Store
          </span>
          <Select
            className="w-44"
            value={store ?? ""}
            onChange={(event) =>
              setStore(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">All stores</option>
            {stores.map((item) => (
              <option key={item.store} value={item.store}>
                {item.store_name} ({item.carton_count})
              </option>
            ))}
          </Select>
        </label>
      }
    />
  );
}
