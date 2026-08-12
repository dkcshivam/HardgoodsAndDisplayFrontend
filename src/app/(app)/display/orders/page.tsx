"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useDisplayOrders, useMerchants } from "@/lib/queries";
import { format } from "@/lib/calc";

export default function DisplayOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [merchant, setMerchant] = useState("");

  const { data, isLoading, isError } = useDisplayOrders({
    search,
    status,
    merchant,
    ordering: "-created_at",
  });
  const merchants = useMerchants({ is_active: true });
  const rows = data?.results ?? [];

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          title="Display orders"
          description="Packed by applying templates until nothing is left over."
          actions={
            <Button size="sm" asChild>
              <Link href="/display/orders/new">
                <Plus /> New order
              </Link>
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search order number, name, buyer…"
          />
          <Select
            className="w-40"
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
          >
            <option value="">All merchants</option>
            {(merchants.data?.results ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="packing">Packing</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
          </Select>
        </div>

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Merchant</TH>
                <TH>Stores</TH>
                <TH className="text-right">Lines</TH>
                <TH className="text-right">Ordered</TH>
                <TH className="text-right">Cartons</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={9}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={9}>
                  <span className="text-destructive">
                    Could not load display orders.
                  </span>
                </EmptyRow>
              )}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={9}>
                  No display orders match these filters.
                </EmptyRow>
              )}
              {rows.map((order) => {
                const ordered = order.lines.reduce(
                  (sum, line) => sum + line.quantity,
                  0,
                );
                const storeCount = new Set(
                  order.lines.map((line) => line.store),
                ).size;
                const unpacked =
                  order.carton_count === 0 && order.status !== "draft";
                return (
                  <TR key={order.id}>
                    <TD>
                      <Link
                        href={`/display/orders/${order.id}/packing`}
                        className="tabular font-medium hover:text-primary"
                      >
                        {order.number}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {order.name}
                      </div>
                    </TD>
                    <TD className="text-secondary-foreground">
                      {order.merchant_name}
                    </TD>
                    <TD className="text-secondary-foreground">
                      {storeCount === 0
                        ? "—"
                        : `${storeCount} store${storeCount === 1 ? "" : "s"}`}
                    </TD>
                    <TD className="tabular text-right">{order.lines.length}</TD>
                    <TD className="tabular text-right">
                      {format.integer(ordered)}
                    </TD>
                    <TD className="tabular text-right">
                      {unpacked ? (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <AlertTriangle className="size-3.5" />0
                        </span>
                      ) : (
                        format.integer(order.carton_count)
                      )}
                    </TD>
                    <TD>
                      <StatusBadge status={order.status} />
                    </TD>
                    <TD className="text-muted-foreground">
                      {format.date(order.created_at)}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/display/orders/${order.id}/packing`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Pack →
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </main>
  );
}
