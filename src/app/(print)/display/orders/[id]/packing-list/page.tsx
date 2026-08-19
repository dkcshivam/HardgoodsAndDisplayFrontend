"use client";

import { use } from "react";
import { DocumentShell } from "@/components/print/document-shell";
import { PackingListDoc } from "@/components/print/packing-list-doc";
import { useDisplayOrder, usePackingListDocument } from "@/lib/queries";

export default function DisplayPackingListPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);

  const order = useDisplayOrder(orderId);
  const doc = usePackingListDocument("display-orders", orderId);

  return (
    <DocumentShell
      title={
        order.data ? `${order.data.number} — packing list` : "Packing list"
      }
      subtitle={order.data?.name ?? ""}
      backHref={`/display/orders/${orderId}/packing`}
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
