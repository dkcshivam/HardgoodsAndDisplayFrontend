"use client";

import Link from "next/link";
import { Fragment, use, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  IndianRupee,
  Package,
  Pencil,
  Printer,
  Receipt,
  Tags,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm";
import { DialogRoot, DialogContent, DialogBody } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { ReconciliationBar } from "@/components/packing/reconciliation-bar";
import { TemplateDialog } from "@/components/display/template-dialog";
import { Gated } from "@/components/packing/gated";
import { RatesDialog } from "@/components/packing/rates-dialog";
import type { RateRow } from "@/components/packing/rates-dialog";
import {
  useDisplayCartons,
  useDisplayOrder,
  useDisplayOrderAction,
  useDisplayPackingPlan,
  usePackTemplate,
  useRemove,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { adjustmentMessage, format, pieceKey } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type {
  Adjustment,
  ApplicableTemplate,
  DisplayOrder,
  QuantityRow,
  StoreProgress,
  TemplateContent,
} from "@/types";

export default function DisplayPackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);
  const toast = useToast();

  // Null is the overview across every store; a store id is that store's plan.
  const [store, setStore] = useState<number | null>(null);

  const order = useDisplayOrder(orderId);
  const plan = useDisplayPackingPlan(orderId, store);
  const {
    applyStep,
    deleteStep,
    replicatePlan,
    downloadPackingList,
    downloadInvoice,
    saveRates,
    advance,
  } = useDisplayOrderAction(orderId, store);

  const [pricing, setPricing] = useState(false);
  // The API sends decimals as numbers; the form edits text.
  const priced = new Map(
    (order.data?.rates ?? []).map(
      (rate) => [rate.product, String(rate.rate_usd)] as const,
    ),
  );

  const removeTemplate = useRemove("pack-templates");

  const [dropping, setDropping] = useState<number | null>(null);
  const [droppingTemplate, setDroppingTemplate] =
    useState<ApplicableTemplate | null>(null);
  const [authoring, setAuthoring] = useState(false);
  const [inspecting, setInspecting] = useState<number | null>(null);
  // Section 2 only carries a summary of each design; editing one needs the
  // whole thing, so it is fetched when the pencil is clicked.
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  const editing = usePackTemplate(editingTemplate);

  if (order.isLoading || plan.isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading packing plan…
      </main>
    );
  }

  if (order.isError || !order.data || !plan.data) {
    return (
      <main className="flex flex-1 items-center justify-center text-sm text-destructive">
        Could not load this order.
      </main>
    );
  }

  const { data } = plan;
  const activeStore = data.stores.find((row) => row.store === store) ?? null;
  // With no store chosen there is nothing to pack *into* — the overview is a
  // place to choose from, not a plan.
  const done = store !== null && data.remaining.length === 0;
  const allDone = data.stores.every((row) => row.is_done);

  // The sheet, the stickers and the invoice all describe finished boxes, so
  // they stay shut until the last store is empty.
  const shortStores = data.stores.filter((row) => !row.is_done).length;
  const gate =
    data.carton_count === 0
      ? "Nothing is packed yet."
      : shortStores > 0
        ? `${shortStores} store${shortStores === 1 ? " is" : "s are"} still short.`
        : "";

  const rateRows = styleRows(order.data, priced);
  const unpriced = rateRows.filter((row) => !row.rate.trim()).length;
  const invoiceGate =
    gate ||
    (unpriced > 0
      ? `${unpriced} style${unpriced === 1 ? " has" : "s have"} no rate yet.`
      : "");

  // Stays true through the refetch, not just the request. Re-enabling the
  // moment the POST returns leaves the old capacities on screen with live
  // buttons, and a second click lands on whatever has re-sorted into place.
  const busy =
    applyStep.isPending ||
    deleteStep.isPending ||
    replicatePlan.isPending ||
    plan.isFetching;

  function report(adjustments?: Adjustment[]) {
    for (const item of adjustments ?? []) {
      toast.error(adjustmentMessage(item));
    }
  }

  function apply(template: number, code: string, capacity: number) {
    if (store === null) return;
    applyStep.mutate(
      { template, store, count: capacity },
      {
        onSuccess: () => {
          toast.success(
            `${code} applied — ${capacity} carton${capacity === 1 ? "" : "s"} added`,
          );
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError
              ? error.detail
              : "Could not apply the template",
          ),
      },
    );
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-5 pb-4">
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
              {order.data.status !== "shipped" && (
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/display/orders/${orderId}/edit`}>
                    <Pencil /> Edit order
                  </Link>
                </Button>
              )}
              <Gated reason={gate}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!!gate || downloadPackingList.isPending}
                  onClick={() =>
                    downloadPackingList.mutate(order.data!.number, {
                      onError: () => toast.error("Could not build the sheet"),
                    })
                  }
                >
                  <Download />
                  {downloadPackingList.isPending ? "Building…" : "Download packing list"}
                </Button>
              </Gated>
              <Gated reason={gate}>
                {gate ? (
                  <Button variant="secondary" size="icon" className="size-8" disabled>
                    <Printer />
                  </Button>
                ) : (
                  <Tooltip label="Print or save as PDF — A4, black and white">
                    <Button variant="secondary" size="icon" className="size-8" asChild>
                      <Link href={`/display/orders/${orderId}/packing-list`} aria-label="Print packing list">
                        <Printer />
                      </Link>
                    </Button>
                  </Tooltip>
                )}
              </Gated>
              <Gated reason={gate}>
                {gate ? (
                  <Button variant="secondary" size="sm" disabled>
                    <Tags /> Box stickers
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/display/orders/${orderId}/stickers`}>
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
                    downloadInvoice.mutate(order.data!.number, {
                      onError: () => toast.error("Could not build the invoice"),
                    })
                  }
                >
                  <Receipt />
                  {downloadInvoice.isPending ? "Building…" : "Invoice"}
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
                      <Link href={`/display/orders/${orderId}/invoice`} aria-label="Print invoice">
                        <Printer />
                      </Link>
                    </Button>
                  </Tooltip>
                )}
              </Gated>
              {order.data.status === "packing" && (
                <Button
                  size="sm"
                  disabled={!data.can_save}
                  title={
                    data.can_save
                      ? undefined
                      : "Pack everything and clear the blockers first."
                  }
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

          {/* Which store, before anything else: a carton ships to exactly one,
              so there is no such thing as packing the order as a whole. */}
          <StorePicker
            stores={data.stores}
            active={store}
            onPick={(next) => setStore(next)}
          />

          {store === null ? (
            <Card className={allDone ? "border-success/25 bg-success-subtle" : undefined}>
              <CardBody className="px-6 py-8 text-center">
                <p className="text-sm">
                  {allDone
                    ? "Every store is packed."
                    : "Choose a store above to pack it."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A carton ships to one store, so the plan is built store by
                  store.
                </p>
              </CardBody>
            </Card>
          ) : (
            <>
          {/* ── 1 ─────────────────────────────────────────────────── */}
          <section>
            <StepHeading
              n={1}
              title={
                done
                  ? `${activeStore?.store_name ?? ""} is packed`
                  : `What ${activeStore?.store_name ?? "this store"} still needs`
              }
              done={done}
            />
            {done ? (
              <Card className="border-success/25 bg-success-subtle">
                <CardBody>
                  <p className="text-sm text-success">
                    Every ordered unit is inside a carton and the counts agree.
                    {order.data.status === "packing" &&
                      " Mark the order packed when you are ready."}
                  </p>
                </CardBody>
              </Card>
            ) : (
              // Whole products, not pieces — which part of one is short is the
              // box design's business, and the template dialog spells it out.
              <ReconciliationBar rows={data.reconciliation} />
            )}
          </section>

          {/* ── 2 ─────────────────────────────────────────────────── */}
          {!done && data.applicable_templates.length === 0 && (
            <section>
              <StepHeading n={2} title="Design the box it goes in" />
              <Card className="border-dashed">
                <CardBody className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    <Package className="size-5" />
                  </div>
                  <h3 className="text-sm font-semibold">
                    {data.steps.length === 0
                      ? "No box designs yet"
                      : "Nothing on file fits what is left"}
                  </h3>
                  <Button onClick={() => setAuthoring(true)}>
                    <Package /> Design a box
                  </Button>
                </CardBody>
              </Card>
            </section>
          )}

          {!done && data.applicable_templates.length > 0 && (
            <section>
              <StepHeading n={2} title="Put some of it in a box" />
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Box designs that fit what is left</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Applying fills out every carton this design still fits.
                      Editing one rebuilds the boxes already packed from it.
                    </p>
                  </div>
                </CardHeader>

                <Table>
                  <THead>
                    <tr>
                      <TH>Design</TH>
                      <TH>Each box holds</TH>
                      <TH className="w-24 text-center">Units/box</TH>
                      <TH className="w-20 text-center">Fits</TH>
                      <TH className="w-40" />
                    </tr>
                  </THead>
                  <tbody>
                    {data.applicable_templates.map((template) => (
                      <TR key={template.template}>
                        <TD>
                          <span className="tabular font-medium">
                            {template.code}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {template.name}
                          </div>
                        </TD>
                        <TD>
                          <TemplateContents rows={template.contents} />
                        </TD>
                        <TD className="tabular text-center text-secondary-foreground">
                          {template.units_per_carton}
                        </TD>
                        <TD className="tabular text-center font-semibold text-primary">
                          {template.capacity}×
                        </TD>
                        <TD>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                apply(
                                  template.template,
                                  template.code,
                                  template.capacity,
                                )
                              }
                            >
                              Apply {template.capacity}×
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              title="Change what goes in this box"
                              onClick={() =>
                                setEditingTemplate(template.template)
                              }
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              className="text-destructive hover:bg-destructive-subtle"
                              onClick={() => setDroppingTemplate(template)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-secondary/30 px-5 py-4">
                  <p className="text-xs text-muted-foreground">
                    Nothing here suits what is left?
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAuthoring(true)}
                  >
                    <Package /> Design a new box
                  </Button>
                </div>
              </Card>
            </section>
          )}

          {/* ── 3 ─────────────────────────────────────────────────── */}
          <section>
            <StepHeading n={3} title="The plan so far" />
            <Card>
              <Table>
                <THead>
                  <tr>
                    <TH className="w-14">Step</TH>
                    <TH>Design</TH>
                    <TH className="w-24 text-right">Cartons</TH>
                    <TH>Used up</TH>
                    <TH>Left after</TH>
                    <TH className="w-44" />
                  </tr>
                </THead>
                <tbody>
                  {data.steps.length === 0 && (
                    <EmptyRow colSpan={6}>
                      Nothing packed yet. Apply a box design above to start.
                    </EmptyRow>
                  )}
                  {data.steps.map((step) => (
                      <TR key={step.sequence}>
                        <TD className="tabular text-muted-foreground">
                          {step.sequence}
                        </TD>
                        {/* The style numbers, not the design's code: a code
                            has no relation to the step it sits on, so a plan
                            reading T-001, T-004, T-002 invites a hunt for the
                            missing ones. The style name is a hover away. */}
                        <TD>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {step.consumed.map((row, index) => (
                              <Fragment key={pieceKey(row)}>
                                {index > 0 && (
                                  <span className="text-muted-foreground">
                                    *
                                  </span>
                                )}
                                <Tooltip label={row.style_name}>
                                  <span
                                    className={cn(
                                      "tabular text-sm font-medium",
                                      row.style_name &&
                                        "cursor-help underline decoration-dotted underline-offset-4",
                                    )}
                                  >
                                    {pieceLabel(row)}
                                  </span>
                                </Tooltip>
                              </Fragment>
                            ))}
                          </div>
                        </TD>
                        <TD className="text-right">
                          <button
                            onClick={() => setInspecting(step.sequence)}
                            className="tabular text-sm font-medium text-primary hover:underline"
                          >
                            {step.carton_count}
                          </button>
                        </TD>
                        <TD>
                          <div className="flex flex-wrap gap-1">
                            {step.consumed.map((row) => (
                              <Badge key={pieceKey(row)} tone="info">
                                <span className="tabular">{row.quantity}</span>
                                {pieceLabel(row)}
                              </Badge>
                            ))}
                          </div>
                        </TD>
                        <TD>
                          {step.remaining_after.length === 0 ? (
                            <span className="text-xs text-success">nothing</span>
                          ) : (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {step.remaining_after.map((row) => (
                                <span
                                  key={pieceKey(row)}
                                  className="tabular text-xs text-muted-foreground"
                                >
                                  {row.quantity} {pieceLabel(row)}
                                </span>
                              ))}
                            </div>
                          )}
                        </TD>
                        <TD>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              className="text-destructive hover:bg-destructive-subtle"
                              onClick={() => setDropping(step.sequence)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TD>
                      </TR>
                  ))}
                </tbody>
              </Table>
              {data.steps.length > 0 && (
                <div className="border-t border-border-subtle px-5 py-3 text-xs text-muted-foreground">
                  Filling out a step or dropping one rebuilds everything after
                  it. Carton numbers already given out never move. Click a
                  carton count to see the boxes.
                </div>
              )}
            </Card>

            {/* The bulk move: most of a big order's stores want the identical
                thing, so one plan usually serves nearly all of them. */}
            {data.replicable.length > 0 && (
              <Card className="mt-3 border-primary/30 bg-primary-subtle">
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-secondary-foreground">
                    <span className="font-medium text-foreground">
                      {data.replicable.length} other store
                      {data.replicable.length === 1 ? "" : "s"} want
                      {data.replicable.length === 1 ? "s" : ""} exactly this
                      and {data.replicable.length === 1 ? "is" : "are"} not
                      packed yet.
                    </span>{" "}
                    <span>
                      {data.replicable
                        .slice(0, 8)
                        .map((row) => row.store_name)
                        .join(", ")}
                      {data.replicable.length > 8 &&
                        ` and ${data.replicable.length - 8} more`}
                    </span>
                  </p>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      if (store === null) return;
                      replicatePlan.mutate(store, {
                        onSuccess: (updated) =>
                          toast.success(
                            `Copied to ${updated.replicated_to?.length ?? 0} store${
                              (updated.replicated_to?.length ?? 0) === 1 ? "" : "s"
                            }`,
                          ),
                        onError: (error) =>
                          toast.error(
                            error instanceof ApiError
                              ? error.detail
                              : "Could not copy this plan",
                          ),
                      });
                    }}
                  >
                    <Copy /> Apply to all {data.replicable.length}
                  </Button>
                </CardBody>
              </Card>
            )}
          </section>
            </>
          )}

          {data.blockers.length > 0 && (
            <Card className="border-primary/30 bg-primary-subtle">
              <CardBody>
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <AlertTriangle className="size-4" />
                  {data.blockers.length}{" "}
                  {data.blockers.length === 1 ? "blocker" : "blockers"}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-primary">
                  {data.blockers.slice(0, 8).map((blocker, index) => (
                    <li key={index}>• {blocker.message}</li>
                  ))}
                  {data.blockers.length > 8 && (
                    <li className="opacity-70">
                      …and {data.blockers.length - 8} more
                    </li>
                  )}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </main>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-6 py-3">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Total label="Steps" value={String(data.steps.length)} />
          <Total label="Cartons" value={format.integer(data.carton_count)} />
          <Total label="Quantity" value={format.integer(data.total_quantity)} />
          <Total
            label="Gross"
            value={`${format.weight(data.total_gross_weight_kg)} kg`}
          />
          <Total label="Volume" value={`${format.cbm(data.total_cbm)} CBM`} />
        </div>
        <div className="flex items-center gap-3">
          {busy && (
            <span className="text-xs text-muted-foreground">Working…</span>
          )}
          {/* Order-wide, whichever store is open — the footer is the whole
              shipment's tally, not the one being worked on. */}
          {!busy && !allDone && (
            <span className="text-xs text-warning">
              {format.integer(
                data.stores.reduce((sum, row) => sum + row.remaining, 0),
              )}{" "}
              pieces still to pack across{" "}
              {data.stores.filter((row) => !row.is_done).length} store
              {data.stores.filter((row) => !row.is_done).length === 1 ? "" : "s"}
            </span>
          )}
          {!busy && allDone && data.blockers.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-success">
              <Check className="size-3.5" /> Plan is sound
            </span>
          )}
        </div>
      </footer>

      <TemplateDialog
        open={authoring}
        onOpenChange={setAuthoring}
        remaining={data.remaining}
        orderId={orderId}
        onSaved={(template) => {
          toast.success(`${template.code} saved — apply it above when ready.`);
          plan.refetch();
        }}
      />

      {/* Edited against the whole catalogue rather than what is left: a design
          that has already packed everything it takes would otherwise open with
          none of its own pieces listed, and saving would empty it. */}
      {editing.data && (
        <TemplateDialog
          open={editingTemplate !== null}
          onOpenChange={(next) => !next && setEditingTemplate(null)}
          template={editing.data}
          orderId={orderId}
          onSaved={(saved) => {
            report(saved.adjustments);
            toast.success(`${saved.code} updated`);
            setEditingTemplate(null);
            plan.refetch();
          }}
        />
      )}

      <RatesDialog
        open={pricing}
        onClose={() => setPricing(false)}
        saving={saveRates.isPending}
        rows={rateRows}
        onSave={(rates) =>
          saveRates.mutate(
            Object.entries(rates)
              .filter(([, rate]) => rate.trim())
              .map(([product, rate]) => ({
                product: Number(product),
                rate_usd: rate.trim(),
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
        open={dropping !== null}
        onOpenChange={(next) => !next && setDropping(null)}
        title={`Drop step ${dropping ?? ""}?`}
        message="Its cartons are removed and every later step is rebuilt. Carton numbers already given to earlier steps do not move."
        confirmLabel="Drop step"
        busy={deleteStep.isPending}
        onConfirm={() => {
          const sequence = dropping;
          if (sequence === null) return;
          deleteStep.mutate(sequence, {
            onSuccess: (updated) => {
              report(updated.adjustments);
              toast.success(`Step ${sequence} dropped`);
              setDropping(null);
            },
            onError: (error) => {
              setDropping(null);
              toast.error(
                error instanceof ApiError
                  ? error.detail
                  : "Could not drop the step",
              );
            },
          });
        }}
      />

      {/* A design outlives the order it was written on, so deleting one here
          takes it off every order — the server refuses if any has packed it. */}
      <ConfirmDialog
        open={droppingTemplate !== null}
        onOpenChange={(next) => !next && setDroppingTemplate(null)}
        title={`Delete ${droppingTemplate?.code ?? ""}?`}
        message="This box design is removed from every order that could use it. A design already packed into cartons is kept instead."
        busy={removeTemplate.isPending}
        onConfirm={() => {
          const target = droppingTemplate;
          if (!target) return;
          removeTemplate.mutate(target.template, {
            onSuccess: () => {
              toast.success(`${target.code} deleted`);
              setDroppingTemplate(null);
              plan.refetch();
            },
            onError: (error) => {
              setDroppingTemplate(null);
              toast.error(
                error instanceof ApiError
                  ? error.detail
                  : "Could not delete this design",
              );
            },
          });
        }}
      />

      <StepCartonsDialog
        orderId={orderId}
        sequence={inspecting}
        onClose={() => setInspecting(null)}
      />
    </>
  );
}

/**
 * The order's stores and how far each has got. Opening here rather than on a
 * plan is the point: at fifty stores the first question is which ones are not
 * finished.
 */
/**
 * The screen exists to answer one question — which store is not finished — so
 * the unfinished ones sit at the top and the packed ones collapse behind a
 * single line. At 17 stores that is two rows instead of six; at 150 it is the
 * difference between a picker and a page.
 */
function StorePicker({
  stores,
  active,
  onPick,
}: {
  stores: StoreProgress[];
  active: number | null;
  onPick: (store: number | null) => void;
}) {
  const [showPacked, setShowPacked] = useState(false);

  const left = stores.filter((row) => !row.is_done);
  const packed = stores.filter((row) => row.is_done);
  // The fold opens itself when it would otherwise hide something: the store
  // being packed, or — with nothing left — every store on the order. Switching
  // store remounts this, so the rule has to be derived, not remembered.
  const open =
    showPacked ||
    left.length === 0 ||
    packed.some((row) => row.store === active);

  const pieces = packed.reduce((sum, row) => sum + row.packed, 0);
  const boxes = packed.reduce((sum, row) => sum + row.carton_count, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Stores on this order</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {left.length === 0
              ? `All ${stores.length} packed.`
              : `${left.length} of ${stores.length} still need packing.`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            Hover a store for its piece count — a multi-part product counts each
            part on its own.
          </p>
        </div>
        {active !== null && (
          <Button variant="secondary" size="sm" onClick={() => onPick(null)}>
            All stores
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-2">
        {left.length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Needs packing · {left.length}
            </div>
            <div className="flex flex-wrap gap-1">
              {left.map((row) => (
                <StoreChip
                  key={row.store}
                  row={row}
                  active={active === row.store}
                  onPick={onPick}
                />
              ))}
            </div>
          </div>
        )}

        {packed.length > 0 && (
          <div className="space-y-1.5">
            <button
              onClick={() => setShowPacked((value) => !value)}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
              />
              <span className="font-semibold text-foreground">
                Packed · {packed.length}
              </span>
              <span className="tabular">
                — {format.integer(pieces)} pieces in {format.integer(boxes)} box
                {boxes === 1 ? "" : "es"}
              </span>
            </button>
            {open && (
              <div className="flex flex-wrap gap-1">
                {packed.map((row) => (
                  <StoreChip
                    key={row.store}
                    row={row}
                    active={active === row.store}
                    onPick={onPick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StoreChip({
  row,
  active,
  onPick,
}: {
  row: StoreProgress;
  active: boolean;
  onPick: (store: number) => void;
}) {
  return (
    <button
      onClick={() => onPick(row.store)}
      // Native, so 150 chips do not mean 150 tooltip providers.
      title={`${format.integer(row.packed)} of ${format.integer(row.ordered)} pieces · ${format.integer(row.carton_count)} box${row.carton_count === 1 ? "" : "es"}`}
      className={cn(
        "tabular rounded border px-1.5 py-0.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary font-semibold text-primary-foreground"
          : row.is_done
            ? "border-success/35 bg-success-subtle text-success hover:border-success/60"
            : "border-warning/45 bg-warning-subtle font-semibold text-warning hover:border-warning/70",
      )}
    >
      {row.store_name}
      {!row.is_done && (
        <span className="ml-1.5 font-bold">
          {format.integer(row.remaining)} left
        </span>
      )}
    </button>
  );
}

/** Numbers the loop, so the page reads as a sequence rather than three panels. */
function StepHeading({
  n,
  title,
  done,
}: {
  n: number;
  title: string;
  done?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className={
          "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold " +
          (done
            ? "bg-success-subtle text-success"
            : "bg-primary-subtle text-primary")
        }
      >
        {done ? <Check className="size-3" /> : n}
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

/**
 * A product's parts are counted separately, so a chip names the part as well
 * — "8 DSP-TBL-01" would not say which of the two is still loose.
 */
function pieceLabel(row: QuantityRow): string {
  return row.part_name ? `${row.style_no} — ${row.part_name}` : row.style_no;
}

/** What one box of a design takes, so picking it is not a guess at a code. */
function TemplateContents({ rows }: { rows: TemplateContent[] }) {
  if (rows.length === 0) {
    return <span className="text-xs text-muted-foreground">empty design</span>;
  }
  return (
    <div className="space-y-0.5">
      {rows.map((row) => (
        <div key={`${row.style_no}-${row.part_name}`} className="text-xs">
          <span className="tabular font-medium text-primary">
            {row.quantity}×
          </span>{" "}
          <span className="tabular">{row.style_no}</span>
          {row.part_name && (
            <span className="text-muted-foreground"> — {row.part_name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** The drill-down. Cartons are paginated, so they never load with the plan. */
function StepCartonsDialog({
  orderId,
  sequence,
  onClose,
}: {
  orderId: number;
  sequence: number | null;
  onClose: () => void;
}) {
  const cartons = useDisplayCartons(orderId, sequence);
  const rows = cartons.data?.results ?? [];

  return (
    <DialogRoot
      open={sequence !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        title={`Step ${sequence ?? ""} — cartons`}
        description={
          cartons.data
            ? `${cartons.data.count} carton${cartons.data.count === 1 ? "" : "s"}, showing the first ${rows.length}.`
            : undefined
        }
        className="max-w-3xl"
      >
        <DialogBody className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>Carton</TH>
                <TH>Contents</TH>
                <TH className="text-center">L × W × H</TH>
                <TH className="text-right">Net</TH>
                <TH className="text-right">Gross</TH>
                <TH className="text-right">CBM</TH>
              </tr>
            </THead>
            <tbody>
              {cartons.isLoading && <EmptyRow colSpan={6}>Loading…</EmptyRow>}
              {!cartons.isLoading && rows.length === 0 && (
                <EmptyRow colSpan={6}>No cartons for this step.</EmptyRow>
              )}
              {rows.map((carton) => (
                <TR key={carton.id}>
                  <TD>
                    <span className="tabular font-medium">
                      {carton.carton_no}
                    </span>
                    {carton.template_code && (
                      <div className="tabular text-xs text-muted-foreground">
                        {carton.template_code}
                      </div>
                    )}
                  </TD>
                  <TD>
                    {carton.contents.map((content) => (
                      <div key={content.id} className="text-xs leading-relaxed">
                        <span className="tabular font-medium">
                          {content.quantity} ×
                        </span>{" "}
                        <span className="tabular">
                          {content.product_style_no}
                        </span>
                      </div>
                    ))}
                  </TD>
                  <TD className="tabular text-center text-secondary-foreground">
                    {format.dimensions(
                      carton.length_in,
                      carton.width_in,
                      carton.height_in,
                    )}
                  </TD>
                  <TD className="tabular text-right text-secondary-foreground">
                    {format.weight(carton.net_weight_kg)}
                  </TD>
                  <TD className="tabular text-right">
                    {format.weight(carton.gross_weight_kg)}
                  </TD>
                  <TD className="tabular text-right text-muted-foreground">
                    {format.cbm(carton.cbm)}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

/** The order names a style once per store; a rate wants it once. */
function styleRows(
  order: DisplayOrder,
  priced: Map<number, string>,
): RateRow[] {
  const seen = new Map<number, RateRow>();
  for (const line of order.lines) {
    if (seen.has(line.product)) continue;
    seen.set(line.product, {
      product: line.product,
      style_no: line.product_style_no,
      style_name: line.product_style_name || line.product_description,
      rate: priced.get(line.product) ?? "",
    });
  }
  return [...seen.values()].sort((a, b) =>
    a.style_no.localeCompare(b.style_no, undefined, { numeric: true }),
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular ml-1.5 font-semibold">{value}</span>
    </div>
  );
}
