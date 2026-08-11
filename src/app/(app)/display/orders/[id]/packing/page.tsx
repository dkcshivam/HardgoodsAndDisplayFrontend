"use client";

import { use, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm";
import { DialogRoot, DialogContent, DialogBody } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ReconciliationBar } from "@/components/packing/reconciliation-bar";
import { TemplateDialog } from "@/components/display/template-dialog";
import {
  useDisplayCartons,
  useDisplayOrder,
  useDisplayOrderAction,
  useDisplayPackingPlan,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { format, pieceKey } from "@/lib/calc";
import type { Adjustment, QuantityRow } from "@/types";

export default function DisplayPackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);
  const toast = useToast();

  const order = useDisplayOrder(orderId);
  const plan = useDisplayPackingPlan(orderId);
  const { applyStep, recountStep, deleteStep, advance } =
    useDisplayOrderAction(orderId);

  const [recount, setRecount] = useState<Record<number, string>>({});
  const [dropping, setDropping] = useState<number | null>(null);
  const [authoring, setAuthoring] = useState(false);
  const [inspecting, setInspecting] = useState<number | null>(null);

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
  const done = data.remaining.length === 0;

  // Stays true through the refetch, not just the request. Re-enabling the
  // moment the POST returns leaves the old capacities on screen with live
  // buttons, and a second click lands on whatever has re-sorted into place.
  const busy =
    applyStep.isPending ||
    recountStep.isPending ||
    deleteStep.isPending ||
    plan.isFetching;

  function report(adjustments?: Adjustment[]) {
    for (const item of adjustments ?? []) {
      toast.error(
        item.now === 0
          ? `Step ${item.sequence} (${item.template_code}) no longer fits and was removed.`
          : `Step ${item.sequence} (${item.template_code}) cut from ${item.was} to ${item.now}.`,
      );
    }
  }

  function refresh() {
    plan.refetch();
    order.refetch();
  }

  function apply(template: number, code: string, capacity: number) {
    applyStep.mutate(
      { template },
      {
        onSuccess: () => {
          toast.success(
            `${code} applied ${capacity}× — ${capacity} carton${capacity === 1 ? "" : "s"} added`,
          );
          refresh();
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
              {order.data.status === "packed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    advance.mutate(undefined, {
                      onSuccess: () => toast.success("Marked shipped"),
                      onError: () => toast.error("Could not advance"),
                    })
                  }
                >
                  Mark shipped <ArrowRight />
                </Button>
              )}
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

          <ReconciliationBar rows={data.reconciliation} />

          {/* ── 1 ─────────────────────────────────────────────────── */}
          <section>
            <StepHeading
              n={1}
              title={done ? "Everything is packed" : "What still needs a box"}
              done={done}
            />
            <Card
              className={
                done ? "border-success/25 bg-success-subtle" : "border-warning/30"
              }
            >
              <CardBody>
                {done ? (
                  <p className="text-sm text-success">
                    Every ordered unit is inside a carton and the counts agree.
                    {order.data.status === "packing" &&
                      " Mark the order packed when you are ready."}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.remaining.map((row) => (
                      <RemainingChip key={pieceKey(row)} row={row} />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
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
                  <div className="max-w-lg">
                    <h3 className="text-sm font-semibold">
                      {data.steps.length === 0
                        ? "No box designs yet"
                        : "Nothing on file fits what is left"}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      A design says what goes into one carton — “30 bows and 5
                      wreaths” — and the box it goes in. Write one against the
                      leftovers above and it will tell you how many cartons that
                      makes and exactly what it strands, before you commit.
                    </p>
                  </div>
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
                      Applying one uses it as many times as it fits. The count
                      is adjustable afterwards, in the plan below.
                    </p>
                  </div>
                </CardHeader>

                <Table>
                  <THead>
                    <tr>
                      <TH>Design</TH>
                      <TH className="w-28 text-right">Units/box</TH>
                      <TH className="w-32" />
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
                        <TD className="tabular text-right text-secondary-foreground">
                          {template.units_per_carton}
                        </TD>
                        <TD className="text-right">
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
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-secondary/30 px-5 py-4">
                  <p className="text-xs text-muted-foreground">
                    Nothing here suits it?{" "}
                    <span className="font-medium text-foreground">
                      Design a new box.
                    </span>{" "}
                    It opens against the leftovers above — the only place you
                    can see them.
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
                    <TH className="w-28 text-right">
                      Count
                      <Pencil className="ml-1 inline size-3 opacity-50" />
                    </TH>
                    <TH className="w-24 text-right">Cartons</TH>
                    <TH>Used up</TH>
                    <TH>Left after</TH>
                    <TH className="w-12" />
                  </tr>
                </THead>
                <tbody>
                  {data.steps.length === 0 && (
                    <EmptyRow colSpan={7}>
                      Nothing packed yet. Apply a box design above to start.
                    </EmptyRow>
                  )}
                  {data.steps.map((step) => (
                    <TR key={step.sequence}>
                      <TD className="tabular text-muted-foreground">
                        {step.sequence}
                      </TD>
                      <TD>
                        <span className="tabular font-medium">
                          {step.template_code}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {step.template_name}
                        </div>
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          min={1}
                          disabled={busy}
                          value={recount[step.sequence] ?? step.count}
                          title="Change this and tab away — every step after it is rebuilt."
                          onChange={(event) =>
                            setRecount({
                              ...recount,
                              [step.sequence]: event.target.value,
                            })
                          }
                          onBlur={() => {
                            const typed = recount[step.sequence];
                            if (typed === undefined) return;
                            const next = Number(typed);
                            if (!next || next === step.count) {
                              setRecount({});
                              return;
                            }
                            recountStep.mutate(
                              { sequence: step.sequence, count: next },
                              {
                                onSuccess: (updated) => {
                                  setRecount({});
                                  report(updated.adjustments);
                                  toast.success(
                                    `Step ${step.sequence} set to ${next}`,
                                  );
                                  refresh();
                                },
                                onError: (error) => {
                                  setRecount({});
                                  toast.error(
                                    error instanceof ApiError
                                      ? error.detail
                                      : "Could not change the count",
                                  );
                                },
                              },
                            );
                          }}
                          className="tabular h-8 text-right"
                        />
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
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          className="text-destructive hover:bg-destructive-subtle"
                          onClick={() => setDropping(step.sequence)}
                        >
                          <Trash2 />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
              {data.steps.length > 0 && (
                <div className="border-t border-border-subtle px-5 py-3 text-xs text-muted-foreground">
                  Change a count and tab away, or drop a step, and everything
                  after it is rebuilt. Carton numbers already given out never
                  move. Click a carton count to see the boxes.
                </div>
              )}
            </Card>
          </section>

          {data.warnings.length > 0 && (
            <Card className="border-warning/30 bg-warning-subtle">
              <CardBody>
                <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                  <Info className="size-4" />
                  {data.warnings.length}{" "}
                  {data.warnings.length === 1 ? "warning" : "warnings"}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-warning">
                  {data.warnings.slice(0, 8).map((warning, index) => (
                    <li key={index}>• {warning.message}</li>
                  ))}
                  {data.warnings.length > 8 && (
                    <li className="opacity-70">
                      …and {data.warnings.length - 8} more
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-xs text-warning/80">
                  Advisory only — a design records a box somebody actually
                  packed, so these never stop a save.
                </p>
              </CardBody>
            </Card>
          )}

          {data.blockers.length > 0 && (
            <Card className="border-destructive-border bg-destructive-subtle">
              <CardBody>
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="size-4" />
                  {data.blockers.length}{" "}
                  {data.blockers.length === 1 ? "blocker" : "blockers"}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-destructive">
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
          {!busy && !done && (
            <span className="text-xs text-warning">
              {format.integer(
                data.remaining.reduce((sum, row) => sum + row.quantity, 0),
              )}{" "}
              units still to pack
            </span>
          )}
          {!busy && done && data.blockers.length === 0 && (
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
              refresh();
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

      <StepCartonsDialog
        orderId={orderId}
        sequence={inspecting}
        onClose={() => setInspecting(null)}
      />
    </>
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

function RemainingChip({ row }: { row: QuantityRow }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-card px-2.5 py-1 text-xs">
      <span className="tabular font-semibold text-warning">{row.quantity}</span>
      <span className="tabular font-medium">{pieceLabel(row)}</span>
      <span className="text-muted-foreground">{row.description}</span>
    </span>
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

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular ml-1.5 font-semibold">{value}</span>
    </div>
  );
}
