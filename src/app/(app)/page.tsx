"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useOrders, useProducts } from "@/lib/queries";
import { format } from "@/lib/calc";

export default function Dashboard() {
  const orders = useOrders({ ordering: "-created_at" });
  const products = useProducts();

  const all = orders.data?.results ?? [];
  const needsPacking = all.filter(
    (order) => order.status === "draft" || order.status === "packing",
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Dashboard"
          description="What needs attention, and what has moved."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="Open orders"
            value={needsPacking.length}
            icon={ClipboardList}
            href="/orders"
          />
          <Stat
            label="Products"
            value={products.data?.count ?? 0}
            icon={Package}
            href="/products"
          />
          <Stat
            label="Shipped"
            value={all.filter((order) => order.status === "shipped").length}
            icon={TrendingUp}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Needs packing</CardTitle>
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
                <TH>Merchant</TH>
                <TH className="text-right">Ordered</TH>
                <TH className="text-right">Cartons</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {orders.isLoading && (
                <EmptyRow colSpan={6}>Loading…</EmptyRow>
              )}
              {orders.isError && (
                <EmptyRow colSpan={6}>
                  <span className="text-destructive">
                    Could not reach the API. Is the backend running?
                  </span>
                </EmptyRow>
              )}
              {orders.isSuccess && needsPacking.length === 0 && (
                <EmptyRow colSpan={6}>Nothing waiting. All packed.</EmptyRow>
              )}
              {needsPacking.map((order) => {
                const ordered = order.lines.reduce(
                  (sum, line) => sum + line.quantity,
                  0,
                );
                return (
                  <TR key={order.id}>
                    <TD>
                      <Link
                        href={`/orders/${order.id}/packing`}
                        className="font-medium hover:text-primary"
                      >
                        <span className="tabular">{order.number}</span>
                        <span className="ml-2 text-muted-foreground">
                          {order.name}
                        </span>
                      </Link>
                    </TD>
                    <TD className="text-secondary-foreground">
                      {order.merchant_name}
                    </TD>
                    <TD className="tabular text-right">{ordered}</TD>
                    <TD className="tabular text-right">
                      {order.carton_count === 0 ? (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <AlertTriangle className="size-3.5" />0
                        </span>
                      ) : (
                        order.carton_count
                      )}
                    </TD>
                    <TD>
                      <StatusBadge status={order.status} />
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/orders/${order.id}/packing`}
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

        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Merchant</TH>
                <TH>Created</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {all.length === 0 && <EmptyRow colSpan={4}>No orders yet.</EmptyRow>}
              {all.slice(0, 5).map((order) => (
                <TR key={order.id}>
                  <TD>
                    <Link
                      href={`/orders/${order.id}/packing`}
                      className="tabular font-medium hover:text-primary"
                    >
                      {order.number}
                    </Link>
                    <span className="ml-2 text-muted-foreground">{order.name}</span>
                  </TD>
                  <TD className="text-secondary-foreground">
                    {order.merchant_name}
                  </TD>
                  <TD className="text-muted-foreground">
                    {format.date(order.created_at)}
                  </TD>
                  <TD>
                    <StatusBadge status={order.status} />
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

function Stat({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <Card className={href ? "transition-colors hover:border-primary/40" : ""}>
      <CardBody className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
          <Icon className="size-4" />
        </div>
      </CardBody>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
