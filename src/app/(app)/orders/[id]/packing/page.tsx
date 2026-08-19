"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  IndianRupee,
  Plus,
  Printer,
  Receipt,
  Tags,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { ReconciliationBar } from "@/components/packing/reconciliation-bar";
import { Gated } from "@/components/packing/gated";
import { RatesDialog } from "@/components/packing/rates-dialog";
import type { RateRow } from "@/components/packing/rates-dialog";
import { useOrder, useOrderAction, usePackingPlan } from "@/lib/queries";
import { api, ApiError } from "@/lib/api";
import { cbm, format } from "@/lib/calc";
import {
  cartonNetWeight,
  findBlockers,
  nextCartonNo,
  reconcile,
  type CartonDraft,
} from "@/lib/packing";
import type { Product } from "@/types";

export default function PackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);
  const toast = useToast();

  const order = useOrder(orderId);
  const plan = usePackingPlan(orderId);
  const {
    autoPack,
    savePacking,
    advance,
    downloadPackingList,
    downloadInvoice,
    saveRates,
  } = useOrderAction(orderId);

  const [pricing, setPricing] = useState(false);

  const [cartons, setCartons] = useState<CartonDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [confirmAutoPack, setConfirmAutoPack] = useState(false);

  // Reconciliation needs each ordered product's parts, which the order
  // payload does not carry.
  const productQueries = useQueries({
    queries: (order.data?.lines ?? []).map((line) => ({
      queryKey: ["products", line.product],
      queryFn: () => api.get<Product>(`/products/${line.product}/`),
    })),
  });

  const products = useMemo(() => {
    const map = new Map<number, Product>();
    for (const result of productQueries) {
      if (result.data) map.set(result.data.id, result.data);
    }
    return map;
  }, [productQueries]);

  // Reset the editable copy whenever the server sends a new plan.
  const [loaded, setLoaded] = useState(plan.data?.cartons);
  if (plan.data && plan.data.cartons !== loaded) {
    setLoaded(plan.data.cartons);
    setCartons(plan.data.cartons.map((carton) => ({ ...carton })));
    setDirty(false);
  }

  const reconciliation = useMemo(
    () => reconcile(order.data?.lines ?? [], cartons, products),
    [order.data?.lines, cartons, products],
  );
  const blockers = useMemo(
    () => findBlockers(cartons, reconciliation),
    [cartons, reconciliation],
  );

  // Colour is recorded on the order line, so the packed rows read it back
  // through the product they hold.
  const colorOf = useMemo(
    () =>
      new Map((order.data?.lines ?? []).map((line) => [line.product, line.color])),
    [order.data?.lines],
  );

  const totals = useMemo(
    () => ({
      quantity: cartons.reduce(
        (sum, carton) =>
          sum + carton.contents.reduce((n, c) => n + c.quantity, 0),
        0,
      ),
      gross: cartons.reduce((sum, c) => sum + (c.gross_weight_kg ?? 0), 0),
      volume: cartons.reduce(
        (sum, c) => sum + cbm(c.length_in, c.width_in, c.height_in),
        0,
      ),
    }),
    [cartons],
  );

  const update = (index: number, patch: Partial<CartonDraft>) => {
    setCartons((all) =>
      all.map((carton, i) => (i === index ? { ...carton, ...patch } : carton)),
    );
    setDirty(true);
  };

  function save() {
    savePacking.mutate(
      cartons.map((carton, index) => ({
        carton_no: carton.carton_no,
        length_in: carton.length_in,
        width_in: carton.width_in,
        height_in: carton.height_in,
        gross_weight_kg: carton.gross_weight_kg,
        sort_order: index,
        contents: carton.contents.map((content) => ({
          product: content.product,
          part: content.part,
          description: content.description,
          quantity: content.quantity,
          unit: content.unit,
          net_weight_kg: content.net_weight_kg,
        })),
      })),
      {
        onSuccess: () => {
          toast.success("Packing plan saved");
          setDirty(false);
          plan.refetch();
          order.refetch();
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.detail : "Could not save the plan",
          ),
      },
    );
  }

  if (order.isLoading || plan.isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading packing plan…
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

  const canSave = blockers.length === 0 && cartons.length > 0;

  // The sheet, the stickers and the invoice all describe finished cartons, so
  // they stay shut until every ordered unit is inside one — and, since they
  // are built server-side, until the plan on screen is the plan on file.
  const short = reconciliation.filter((row) => !row.is_matched).length;
  const gate =
    cartons.length === 0
      ? "Nothing is packed yet."
      : short > 0
        ? `${short} style${short === 1 ? " is" : "s are"} still short.`
        : "";
  const docGate =
    gate ||
    (dirty ? "Save the plan first — these are built from what is stored." : "");

  const rateRows = (order.data.lines ?? []).map(
    (line): RateRow => ({
      product: line.product,
      style_no: line.product_style_no,
      style_name: line.product_style_name || line.product_description,
      rate: line.rate_usd === null ? "" : String(line.rate_usd),
    }),
  );
  const unpriced = rateRows.filter((row) => !row.rate.trim()).length;
  const invoiceGate =
    docGate ||
    (unpriced > 0
      ? `${unpriced} style${unpriced === 1 ? " has" : "s have"} no rate yet.`
      : "");

  return (
    <>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-5 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="tabular text-xl font-semibold tracking-tight">
                  {order.data.number}
                </h1>
                <StatusBadge status={order.data.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {order.data.name} · {order.data.merchant_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  cartons.length > 0 ? setConfirmAutoPack(true) : runAutoPack()
                }
                disabled={autoPack.isPending}
              >
                <Wand2 />{" "}
                {autoPack.isPending ? "Generating…" : "Generate packing list"}
              </Button>
              <Gated reason={docGate}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!!docGate || downloadPackingList.isPending}
                  onClick={() =>
                    downloadPackingList.mutate(order.data.number, {
                      onError: (error) =>
                        toast.error(
                          error instanceof ApiError
                            ? error.detail
                            : "Could not build the packing list",
                        ),
                    })
                  }
                >
                  <FileSpreadsheet />{" "}
                  {downloadPackingList.isPending ? "Preparing…" : "Download packing list"}
                </Button>
              </Gated>
              <Gated reason={docGate}>
                {docGate ? (
                  <Button variant="secondary" size="icon" className="size-8" disabled>
                    <Printer />
                  </Button>
                ) : (
                  <Tooltip label="Print or save as PDF — A4, black and white">
                    <Button variant="secondary" size="icon" className="size-8" asChild>
                      <Link href={`/orders/${orderId}/packing-list`} aria-label="Print packing list">
                        <Printer />
                      </Link>
                    </Button>
                  </Tooltip>
                )}
              </Gated>
              <Gated reason={docGate}>
                {docGate ? (
                  <Button variant="secondary" size="sm" disabled>
                    <Tags /> Box stickers
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/orders/${orderId}/stickers`}>
                      <Tags /> Box stickers
                    </Link>
                  </Button>
                )}
              </Gated>
              <Gated reason={gate}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!!gate}
                  onClick={() => setPricing(true)}
                >
                  <IndianRupee /> Rates
                </Button>
              </Gated>
              <Gated reason={invoiceGate}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!!invoiceGate || downloadInvoice.isPending}
                  onClick={() =>
                    downloadInvoice.mutate(order.data.number, {
                      onError: (error) =>
                        toast.error(
                          error instanceof ApiError
                            ? error.detail
                            : "Could not build the invoice",
                        ),
                    })
                  }
                >
                  <Receipt />
                  {downloadInvoice.isPending ? "Preparing…" : "Invoice"}
                </Button>
              </Gated>
              <Gated reason={invoiceGate}>
                {invoiceGate ? (
                  <Button variant="secondary" size="icon" className="size-8" disabled>
                    <Printer />
                  </Button>
                ) : (
                  <Tooltip label="Print or save as PDF — A4, black and white">
                    <Button variant="secondary" size="icon" className="size-8" asChild>
                      <Link href={`/orders/${orderId}/invoice`} aria-label="Print invoice">
                        <Printer />
                      </Link>
                    </Button>
                  </Tooltip>
                )}
              </Gated>
              {order.data.status === "packing" && (
                <Button
                  size="sm"
                  disabled={!canSave || dirty}
                  onClick={() =>
                    advance.mutate(undefined, {
                      onSuccess: () => toast.success("Marked packed"),
                      onError: (error) =>
                        toast.error(
                          error instanceof ApiError
                            ? error.detail
                            : "Resolve packing first",
                        ),
                    })
                  }
                >
                  Mark packed <ArrowRight />
                </Button>
              )}
            </div>
          </div>

          <ReconciliationBar rows={reconciliation} />

          <Card>
            <Table>
              <THead>
                <tr>
                  <TH className="w-32">Carton No</TH>
                  <TH>Contents</TH>
                  <TH className="w-56 text-center">L × W × H (in)</TH>
                  <TH className="w-24 text-right">Qty</TH>
                  <TH className="w-28 text-right">Net (kg)</TH>
                  <TH className="w-32 text-right">Gross (kg)</TH>
                  <TH className="w-24 text-right">CBM</TH>
                  <TH className="w-12" />
                </tr>
              </THead>
              <tbody>
                {cartons.length === 0 && (
                  <EmptyRow colSpan={8}>
                    No cartons yet. Run auto-pack to propose a plan from the
                    ordered products.
                  </EmptyRow>
                )}
                {cartons.map((carton, index) => {
                  const net = cartonNetWeight(carton);
                  const gross = carton.gross_weight_kg ?? 0;
                  const quantity = carton.contents.reduce(
                    (sum, content) => sum + content.quantity,
                    0,
                  );
                  const duplicate =
                    cartons.filter(
                      (other) =>
                        (other.carton_no ?? "").trim() ===
                        (carton.carton_no ?? "").trim(),
                    ).length > 1;

                  return (
                    <TR key={carton.id ?? `new-${index}`}>
                      <TD>
                        <Input
                          value={carton.carton_no}
                          invalid={!carton.carton_no.trim() || duplicate}
                          onChange={(event) =>
                            update(index, { carton_no: event.target.value })
                          }
                          className="tabular h-8"
                        />
                      </TD>
                      <TD>
                        {carton.contents.map((content, contentIndex) => (
                          <div
                            key={contentIndex}
                            className="text-xs leading-relaxed"
                          >
                            <span className="tabular font-medium">
                              {content.product_style_no}
                            </span>
                            {content.part_name && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {content.part_name}
                              </span>
                            )}
                            {colorOf.get(content.product) && (
                              <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                                {colorOf.get(content.product)}
                              </span>
                            )}
                          </div>
                        ))}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1">
                          {(["length_in", "width_in", "height_in"] as const).map(
                            (key) => (
                              <Input
                                key={key}
                                type="number"
                                step="0.01"
                                value={carton[key] ?? ""}
                                invalid={!carton[key]}
                                onChange={(event) =>
                                  update(index, {
                                    [key]:
                                      event.target.value === ""
                                        ? null
                                        : Number(event.target.value),
                                  })
                                }
                                className="tabular h-8 px-1.5 text-center"
                              />
                            ),
                          )}
                        </div>
                      </TD>
                      <TD className="tabular text-right">{quantity}</TD>
                      <TD className="tabular text-right text-secondary-foreground">
                        {format.weight(net)}
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          step="0.001"
                          value={carton.gross_weight_kg ?? ""}
                          invalid={gross < net}
                          onChange={(event) =>
                            update(index, {
                              gross_weight_kg:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                          className="tabular h-8 text-right"
                        />
                      </TD>
                      <TD className="tabular text-right text-secondary-foreground">
                        {format.cbm(
                          cbm(carton.length_in, carton.width_in, carton.height_in),
                        )}
                      </TD>
                      <TD>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive-subtle"
                          onClick={() => {
                            setCartons(cartons.filter((_, i) => i !== index));
                            setDirty(true);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>

            <div className="border-t border-border-subtle px-4 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const line = order.data.lines[0];
                  if (!line) {
                    toast.error("This order has no products.");
                    return;
                  }
                  setCartons([
                    ...cartons,
                    {
                      carton_no: nextCartonNo(cartons),
                      length_in: null,
                      width_in: null,
                      height_in: null,
                      gross_weight_kg: null,
                      sort_order: cartons.length,
                      contents: [
                        {
                          id: 0,
                          product: line.product,
                          product_style_no: line.product_style_no,
                          part: null,
                          part_name: null,
                          description: line.product_description,
                          quantity: 1,
                          unit: "pcs",
                          net_weight_kg: 0,
                        },
                      ],
                    },
                  ]);
                  setDirty(true);
                }}
              >
                <Plus /> Add carton
              </Button>
            </div>
          </Card>

          {blockers.length > 0 && (
            <Card className="border-destructive-border bg-destructive-subtle">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="size-4" />
                  {blockers.length}{" "}
                  {blockers.length === 1 ? "blocker" : "blockers"}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-destructive">
                  {blockers.map((blocker, index) => (
                    <li key={index}>• {blocker.message}</li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* A layout sibling of the scroll area, not page content. */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-6 py-3">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Total label="Cartons" value={String(cartons.length)} />
          <Total label="Quantity" value={String(totals.quantity)} />
          <Total label="Gross" value={`${format.weight(totals.gross)} kg`} />
          <Total label="Volume" value={`${format.cbm(totals.volume)} CBM`} />
        </div>
        <div className="flex items-center gap-3">
          {!canSave && cartons.length > 0 && (
            <span className="text-xs text-destructive">
              {blockers.length} to resolve
            </span>
          )}
          {dirty && canSave && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <Button
            onClick={save}
            disabled={!canSave || savePacking.isPending}
          >
            {savePacking.isPending ? "Saving…" : "Save packing plan"}
          </Button>
        </div>
      </footer>

      <RatesDialog
        open={pricing}
        onClose={() => setPricing(false)}
        saving={saveRates.isPending}
        rows={rateRows}
        onSave={(rates) =>
          saveRates.mutate(
            (order.data.lines ?? []).map((line) => ({
              product: line.product,
              color: line.color,
              quantity: line.quantity,
              rate_usd: (rates[line.product] ?? "").trim() || null,
            })),
            {
              onSuccess: () => {
                toast.success("Rates saved");
                setPricing(false);
              },
              onError: () => toast.error("Could not save the rates"),
            },
          )
        }
      />

      <ConfirmDialog
        open={confirmAutoPack}
        onOpenChange={setConfirmAutoPack}
        title="Replace the current plan?"
        message="Generating rebuilds every carton from the ordered products' recipes. Edits made here will be lost."
        confirmLabel="Replace"
        busy={autoPack.isPending}
        onConfirm={() => {
          runAutoPack();
          setConfirmAutoPack(false);
        }}
      />
    </>
  );

  function runAutoPack() {
    autoPack.mutate(undefined, {
      onSuccess: () => {
        toast.success("Plan proposed. Every value stays editable.");
        plan.refetch();
        order.refetch();
      },
      onError: (error) =>
        toast.error(
          error instanceof ApiError ? error.detail : "Could not auto-pack",
        ),
    });
  }
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular ml-1.5 font-semibold">{value}</span>
    </div>
  );
}
