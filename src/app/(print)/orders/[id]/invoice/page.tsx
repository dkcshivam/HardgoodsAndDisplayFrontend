"use client";

import { use } from "react";
import { DocumentShell } from "@/components/print/document-shell";
import { InvoiceDoc } from "@/components/print/invoice-doc";
import { useOrder, useInvoiceDocument } from "@/lib/queries";

export default function OrderInvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);

  const order = useOrder(orderId);
  const doc = useInvoiceDocument("orders", orderId);

  return (
    <DocumentShell
      title={
        order.data ? `${order.data.number} — invoice` : "Invoice"
      }
      subtitle={order.data?.name ?? ""}
      backHref={`/orders/${orderId}/packing`}
      orientation="portrait"
      loading={doc.isLoading || order.isLoading}
      error={
        doc.isError
          ? "Nothing to invoice yet — pack the order first."
          : undefined
      }
    >
      {doc.data && <InvoiceDoc doc={doc.data} />}
    </DocumentShell>
  );
}
