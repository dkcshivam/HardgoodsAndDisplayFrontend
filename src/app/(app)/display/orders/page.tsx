"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  THead,
  TH,
  SortTH,
  TR,
  TD,
  EmptyRow,
} from "@/components/ui/table";
import { useDisplayOrders, useMerchants, useStores } from "@/lib/queries";
import { useSort } from "@/lib/sort";
import { downloadOrderTemplate } from "@/lib/order-template";
import { useToast } from "@/components/ui/toast";
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

  // The template is a column per store, so it is written from the live list
  // rather than kept as a file that would fall behind it.
  const toast = useToast();
  const stores = useStores({ is_active: true, page_size: 1000 });
  const [writing, setWriting] = useState(false);

  async function downloadTemplate() {
    const list = stores.data?.results ?? [];
    if (list.length === 0) {
      toast.error("No stores yet — add them before taking a template.");
      return;
    }
    setWriting(true);
    try {
      await downloadOrderTemplate(list);
    } catch {
      toast.error("Could not build the template.");
    } finally {
      setWriting(false);
    }
  }

  const units = (order: (typeof rows)[number]) =>
    order.lines.reduce((sum, line) => sum + line.quantity, 0);

  const { sort, toggle, sorted } = useSort(rows, {
    number: (order) => order.number,
    merchant: (order) => order.merchant_name,
    stores: (order) => new Set(order.lines.map((line) => line.store)).size,
    ordered: units,
    cartons: (order) => order.carton_count,
    status: (order) => order.status,
    created: (order) => order.created_at,
  });

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          title="Display orders"
          description="Packed by applying templates until nothing is left over."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadTemplate}
                disabled={writing || stores.isLoading}
              >
                <Download /> {writing ? "Building…" : "Order sheet template"}
              </Button>
              <Button size="sm" asChild>
                <Link href="/display/orders/new">
                  <Plus /> New order
                </Link>
              </Button>
            </div>
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
          <Table className="table-fixed">
            <THead>
              <tr>
                <SortTH column="number" sort={sort} onSort={toggle} className="w-[20%]">
                  Order
                </SortTH>
                <SortTH column="merchant" sort={sort} onSort={toggle} className="w-[14%]">
                  Merchant
                </SortTH>
                <SortTH column="stores" sort={sort} onSort={toggle} className="w-[11%]">
                  Stores
                </SortTH>
                <SortTH
                  column="ordered"
                  sort={sort}
                  onSort={toggle}
                  className="w-[13%] text-center"
                >
                  Units ordered
                </SortTH>
                <SortTH
                  column="cartons"
                  sort={sort}
                  onSort={toggle}
                  className="w-[10%] text-center"
                >
                  Cartons
                </SortTH>
                <SortTH column="status" sort={sort} onSort={toggle} className="w-[11%]">
                  Status
                </SortTH>
                <SortTH column="created" sort={sort} onSort={toggle} className="w-[12%]">
                  Created
                </SortTH>
                <TH className="w-[9%]" />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={8}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={8}>
                  <span className="text-destructive">
                    Could not load display orders.
                  </span>
                </EmptyRow>
              )}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={8}>
                  No display orders match these filters.
                </EmptyRow>
              )}
              {sorted.map((order) => {
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
                      <div className="truncate text-xs text-muted-foreground">
                        {order.name}
                      </div>
                    </TD>
                    <TD className="truncate text-secondary-foreground">
                      {order.merchant_name}
                    </TD>
                    <TD className="text-secondary-foreground">
                      {storeCount === 0
                        ? "—"
                        : `${storeCount} store${storeCount === 1 ? "" : "s"}`}
                    </TD>
                    <TD className="tabular text-center">
                      {format.integer(ordered)}
                    </TD>
                    <TD className="tabular text-center">
                      {unpacked ? (
                        <span className="inline-flex items-center justify-center gap-1 text-warning">
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
                      {order.status !== "shipped" && (
                        <Link
                          href={`/display/orders/${order.id}/edit`}
                          className="text-xs font-medium text-secondary-foreground hover:text-primary hover:underline"
                        >
                          Edit
                        </Link>
                      )}
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
