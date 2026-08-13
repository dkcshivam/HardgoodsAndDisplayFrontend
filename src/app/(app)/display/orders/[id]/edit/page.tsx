"use client";

import { use } from "react";
import { DisplayOrderForm } from "@/components/display/display-order-form";
import { useDisplayOrder } from "@/lib/queries";

export default function EditDisplayOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const order = useDisplayOrder(Number(id));

  // The form seeds its state once, so it must not mount before the order is
  // there — it would start blank and then never catch up.
  if (order.isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading order…
      </main>
    );
  }

  if (order.isError || !order.data) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-destructive">
        Could not load this order.
      </main>
    );
  }

  return <DisplayOrderForm order={order.data} />;
}
