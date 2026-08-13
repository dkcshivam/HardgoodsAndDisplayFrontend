"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  ClipboardList,
  LayoutGrid,
  Package,
  Sparkles,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useDisplayOrders, useOrders } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { DisplayOrder, Order, OrderStatus } from "@/types";

const OPEN: OrderStatus[] = ["draft", "packing"];

interface AttentionRow {
  key: string;
  href: string;
  number: string;
  name: string;
  merchant_name: string;
  city: string;
  status: OrderStatus;
  created_at: string;
}

function toRow(order: Order | DisplayOrder, href: string): AttentionRow {
  return {
    key: href,
    href,
    number: order.number,
    name: order.name,
    merchant_name: order.merchant_name,
    city: order.shipping_address.city,
    status: order.status,
    created_at: order.created_at,
  };
}

export default function Dashboard() {
  const hardgoods = useOrders({ ordering: "-created_at" });
  const display = useDisplayOrders({ ordering: "-created_at" });

  const hardgoodsAll = hardgoods.data?.results ?? [];
  const displayAll = display.data?.results ?? [];

  const hardgoodsOpen = hardgoodsAll.filter((o) => OPEN.includes(o.status));
  const displayOpen = displayAll.filter((o) => OPEN.includes(o.status));
  const awaitingShipment =
    hardgoodsAll.filter((o) => o.status === "packed").length +
    displayAll.filter((o) => o.status === "packed").length;

  const needsAttention: AttentionRow[] = [
    ...hardgoodsOpen.map((o) => toRow(o, `/orders/${o.id}/packing`)),
    ...displayOpen.map((o) => toRow(o, `/display/orders/${o.id}/packing`)),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const loading = hardgoods.isLoading || display.isLoading;
  const failed = hardgoods.isError || display.isError;

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Dashboard"
          description="Here's what's moving across the floor today."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Open orders"
            sub="Across all sections"
            value={hardgoodsOpen.length + displayOpen.length}
            icon={LayoutGrid}
            highlighted
          />
          <Stat
            label="Hardgoods — open"
            sub="Draft or packing"
            value={hardgoodsOpen.length}
            icon={Package}
            href="/orders"
          />
          <Stat
            label="Display — open"
            sub="Draft or packing"
            value={displayOpen.length}
            icon={Sparkles}
            href="/display/orders"
          />
          <Stat
            label="Awaiting shipment"
            sub="Packed, not shipped"
            value={awaitingShipment}
            icon={Truck}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <Link
              href="/orders"
              className="text-xs font-medium text-primary hover:underline"
            >
              All orders
            </Link>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH className="w-32">Number</TH>
                <TH className="w-28">Status</TH>
              </tr>
            </THead>
            <tbody>
              {loading && <EmptyRow colSpan={3}>Loading…</EmptyRow>}
              {failed && (
                <EmptyRow colSpan={3}>
                  <span className="text-destructive">
                    Could not reach the API. Is the backend running?
                  </span>
                </EmptyRow>
              )}
              {!loading && !failed && needsAttention.length === 0 && (
                <EmptyRow colSpan={3}>Nothing waiting. All packed.</EmptyRow>
              )}
              {needsAttention.map((row) => (
                <TR key={row.key}>
                  <TD>
                    <Link href={row.href} className="flex items-center gap-3">
                      <AttentionIcon status={row.status} />
                      <span>
                        <span className="block font-medium hover:text-primary">
                          {row.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[row.merchant_name, row.city]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="tabular text-muted-foreground">
                    {row.number}
                  </TD>
                  <TD>
                    <StatusBadge status={row.status} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </main>
  );
}

function AttentionIcon({ status }: { status: OrderStatus }) {
  if (status === "packing") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning-subtle text-warning">
        <Boxes className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
      <ClipboardList className="size-4" />
    </div>
  );
}

function Stat({
  label,
  sub,
  value,
  icon: Icon,
  href,
  highlighted,
}: {
  label: string;
  sub: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  highlighted?: boolean;
}) {
  const content = (
    <Card
      className={cn(
        "h-full",
        highlighted && "border-primary bg-primary text-primary-foreground",
        href && !highlighted && "transition-colors hover:border-primary/40",
        href && highlighted && "transition-opacity hover:opacity-90",
      )}
    >
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              highlighted
                ? "bg-white/15 text-primary-foreground"
                : "bg-primary-subtle text-primary",
            )}
          >
            <Icon className="size-4" />
          </div>
          {href && (
            <ArrowUpRight
              className={cn(
                "size-4",
                highlighted
                  ? "text-primary-foreground/50"
                  : "text-muted-foreground/50",
              )}
            />
          )}
        </div>
        <div>
          <div className="tabular text-2xl font-semibold">{value}</div>
          <div className="text-xs font-semibold">{label}</div>
          <div
            className={cn(
              "text-xs",
              highlighted ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {sub}
          </div>
        </div>
      </CardBody>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
