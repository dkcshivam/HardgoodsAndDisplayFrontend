"use client";

import { use } from "react";
import { DocumentShell } from "@/components/print/document-shell";
import { PackingListDoc } from "@/components/print/packing-list-doc";
import { useOrder, usePackingListDocument } from "@/lib/queries";

export default function OrderPackingListPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);

  const order = useOrder(orderId);
  const doc = usePackingListDocument("orders", orderId);

  return (
    <DocumentShell
      title={
        order.data ? `${order.data.number} — packing list` : "Packing list"
      }
      subtitle={order.data?.name ?? ""}
      backHref={`/orders/${orderId}/packing`}
      orientation="landscape"
      loading={doc.isLoading || order.isLoading}
      error={
        doc.isError
          ? "Nothing to list yet — pack the order first."
          : undefined
      }
    >
      {doc.data && <PackingListDoc doc={doc.data} />}
    </DocumentShell>
  );
}
