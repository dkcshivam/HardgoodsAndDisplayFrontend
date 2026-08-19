"use client";

import { use, useMemo } from "react";
import { StickerSheet } from "@/components/packing/sticker-sheet";
import { useOrder, usePackingPlan, useProducts } from "@/lib/queries";
import { hardgoodsStickers } from "@/lib/stickers";

export default function OrderStickersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);

  const order = useOrder(orderId);
  const plan = usePackingPlan(orderId);
  const products = useProducts({ page_size: 1000 });

  const stickers = useMemo(
    () =>
      hardgoodsStickers(
        plan.data?.cartons ?? [],
        order.data?.number ?? "",
        products.data?.results ?? [],
      ),
    [plan.data, order.data, products.data],
  );

  return (
    <StickerSheet
      title={order.data ? `${order.data.number} — box stickers` : "Box stickers"}
      subtitle={order.data?.name ?? ""}
      backHref={`/orders/${orderId}/packing`}
      stickers={stickers}
      loading={plan.isLoading || products.isLoading || order.isLoading}
    />
  );
}
