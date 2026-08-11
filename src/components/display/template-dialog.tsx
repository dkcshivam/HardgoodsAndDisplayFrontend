"use client";

import { useState } from "react";
import { Check, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogRoot,
  DialogContent,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, FieldRow } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useDisplayProducts, useSave } from "@/lib/queries";
import {
  cbm,
  evenSplits,
  format,
  maxApplications,
  mixedCartonGrossWeight,
  mixedCartonNetWeight,
  pieceKey,
} from "@/lib/calc";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PackTemplate, QuantityRow } from "@/types";

interface ItemDraft {
  product: number | null;
  /** Which part of it. Required when the product packs as parts. */
  part: number | null;
  quantity: number;
}

interface Draft {
  id?: number;
  code: string;
  name: string;
  remark: string;
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
  box_weight_kg: number | null;
  packing_material_weight_kg: number | null;
  is_library: boolean;
  order: number | null;
  items: ItemDraft[];
}

const BLANK: Draft = {
  code: "",
  name: "",
  remark: "",
  box_length_in: null,
  box_width_in: null,
  box_height_in: null,
  box_weight_kg: null,
  packing_material_weight_kg: null,
  is_library: true,
  order: null,
  items: [{ product: null, part: null, quantity: 1 }],
};

/**
 * Designing a box. Opened from an order's packing screen against whatever is
 * left, which is why it takes `remaining` — and why it spends most of its room
 * telling you what a design would leave behind.
 */
export function TemplateDialog({
  open,
  onOpenChange,
  template,
  remaining,
  orderId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PackTemplate;
  remaining?: QuantityRow[];
  orderId?: number;
  onSaved?: (template: PackTemplate) => void;
}) {
  const toast = useToast();
  const products = useDisplayProducts({ status: "active" });
  const save = useSave<Draft, PackTemplate>("pack-templates");

  const catalogue = products.data?.results ?? [];

  const [draft, setDraft] = useState<Draft>(() => seed(template, remaining));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [subject, setSubject] = useState(template?.id ?? null);
  if (open && subject !== (template?.id ?? null)) {
    setSubject(template?.id ?? null);
    setDraft(seed(template, remaining));
    setErrors({});
  }

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const number = (value: string) => (value === "" ? null : Number(value));

  const setItem = (index: number, patch: Partial<ItemDraft>) =>
    setDraft({
      ...draft,
      items: draft.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });

  const filled = draft.items.filter(
    (item): item is { product: number; part: number | null; quantity: number } =>
      item.product !== null,
  );

  const productOf = (id: number) => catalogue.find((p) => p.id === id);

  /** The part a row names, or the product itself when it is one piece. */
  const pieceOf = (item: { product: number; part: number | null }) => {
    const product = productOf(item.product);
    if (!product) return undefined;
    return item.part === null
      ? product
      : product.parts.find((part) => part.id === item.part);
  };

  const labelOf = (item: { product: number; part: number | null }) => {
    const product = productOf(item.product);
    if (!product) return "";
    const part = item.part
      ? product.parts.find((candidate) => candidate.id === item.part)
      : undefined;
    return part ? `${product.style_no} — ${part.name}` : product.style_no;
  };

  const left = new Map(
    (remaining ?? []).map((row) => [pieceKey(row), row.quantity]),
  );
  const fits = remaining ? maxApplications(filled, left) : null;

  // What this design would actually do to the order — the point of the dialog.
  const outcome = filled.map((item) => {
    const available = left.get(pieceKey(item)) ?? 0;
    const used = item.quantity * (fits ?? 0);
    return {
      key: pieceKey(item),
      styleNo: labelOf(item),
      perBox: item.quantity,
      available,
      used,
      over: available - used,
    };
  });

  const stranded = outcome.filter((row) => row.over > 0);

  const weighed = filled.map((item) => ({
    productWeightKg: pieceOf(item)?.product_weight_kg ?? null,
    quantity: item.quantity,
  }));
  const net = mixedCartonNetWeight(weighed, draft.packing_material_weight_kg);
  const gross = mixedCartonGrossWeight(
    weighed,
    draft.packing_material_weight_kg,
    draft.box_weight_kg,
  );
  const boxVolume = cbm(
    draft.box_length_in,
    draft.box_width_in,
    draft.box_height_in,
  );
  const occupied = filled.reduce(
    (sum, item) => sum + (pieceOf(item)?.unit_cbm ?? 0) * item.quantity,
    0,
  );
  const fill = boxVolume > 0 ? occupied / boxVolume : 0;

  function submit() {
    const found: Record<string, string> = {};
    if (!draft.code.trim()) found.code = "Required";
    if (!draft.name.trim()) found.name = "Required";
    if (filled.length === 0) found.items = "A design needs at least one piece.";

    const keys = filled.map(pieceKey);
    if (new Set(keys).size !== keys.length)
      found.items = "The same piece is listed twice — combine the rows.";

    const unnamed = filled.find(
      (item) => item.part === null && productOf(item.product)?.is_multi_part,
    );
    if (unnamed)
      found.items = `${productOf(unnamed.product)?.style_no} packs as parts — say which part goes in this box.`;

    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Fix the highlighted fields.");
      return;
    }

    // Without an order to scope it to, a one-off would be offered nowhere —
    // so designs written outside a packing screen always go to the library.
    const library = orderId === undefined ? true : draft.is_library;

    save.mutate(
      {
        ...draft,
        items: filled,
        is_library: library,
        order: library ? null : (orderId ?? null),
      },
      {
        onSuccess: (saved) => {
          toast.success(template ? "Design updated" : `${saved.code} created`);
          onOpenChange(false);
          onSaved?.(saved);
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            const field = error.fieldError("code");
            if (field) setErrors({ code: field });
            toast.error(field ?? error.detail);
          } else {
            toast.error("Could not save the design");
          }
        },
      },
    );
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={template ? `Edit ${template.code}` : "Design a box"}
        description="What goes inside, and the box it goes in."
        className="max-w-2xl"
      >
        <DialogBody className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-secondary-foreground">
                What goes in the box
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  set({
                    items: [
                      ...draft.items,
                      { product: null, part: null, quantity: 1 },
                    ],
                  })
                }
              >
                <Plus /> Add piece
              </Button>
            </div>

            <div className="space-y-2">
              {draft.items.map((item, index) => {
                const chosen =
                  item.product !== null ? productOf(item.product) : undefined;
                const available =
                  item.product !== null
                    ? left.get(
                        pieceKey({ product: item.product, part: item.part }),
                      )
                    : undefined;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={item.product ?? ""}
                      onChange={(event) =>
                        // The old part belonged to the old product, so it goes.
                        setItem(index, {
                          product: number(event.target.value),
                          part: null,
                        })
                      }
                      className="flex-1"
                    >
                      <option value="">Choose a product</option>
                      {catalogue.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.style_no} · {product.description}
                        </option>
                      ))}
                    </Select>
                    {chosen?.is_multi_part && (
                      <Select
                        value={item.part ?? ""}
                        onChange={(event) =>
                          setItem(index, { part: number(event.target.value) })
                        }
                        className="flex-1"
                      >
                        <option value="">Which part?</option>
                        {chosen.parts.map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.name}
                          </option>
                        ))}
                      </Select>
                    )}
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) =>
                        setItem(index, {
                          quantity: Number(event.target.value) || 1,
                        })
                      }
                      className="tabular w-20 text-right"
                    />
                    <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                      {available === undefined ? "" : `of ${available}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive-subtle"
                      onClick={() =>
                        set({ items: draft.items.filter((_, i) => i !== index) })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
            {errors.items && (
              <p className="mt-1.5 text-xs text-destructive">{errors.items}</p>
            )}
          </div>

          {/* The guidance. Everything above is inputs; this is the answer. */}
          {remaining && filled.length > 0 && (
            <div
              className={cn(
                "rounded-lg border px-4 py-3",
                stranded.length === 0
                  ? "border-success/25 bg-success-subtle"
                  : "border-warning/30 bg-warning-subtle",
              )}
            >
              {fits === 0 ? (
                <p className="flex items-start gap-2 text-xs text-warning">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  This design does not fit what is left — one of its products has
                  run out, or it asks for more per box than remain.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {stranded.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-success">
                        <Check className="size-4" />
                        Fits {fits}× and uses every one
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-warning">
                        <TriangleAlert className="size-4" />
                        Fits {fits}×, but leaves some behind
                      </span>
                    )}
                  </div>

                  <table className="mt-2 w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left font-medium">Product</th>
                        <th className="text-right font-medium">Per box</th>
                        <th className="text-right font-medium">Uses</th>
                        <th className="text-right font-medium">Left over</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {outcome.map((row) => (
                        <tr key={row.key}>
                          <td className="py-0.5">{row.styleNo}</td>
                          <td className="py-0.5 text-right">{row.perBox}</td>
                          <td className="py-0.5 text-right">{row.used}</td>
                          <td
                            className={cn(
                              "py-0.5 text-right font-semibold",
                              row.over > 0 ? "text-warning" : "text-success",
                            )}
                          >
                            {row.over}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {stranded.map((row) => {
                    const splits = evenSplits(row.available, row.perBox);
                    if (splits.length === 0) return null;
                    return (
                      <p key={row.key} className="mt-2 text-xs text-warning">
                        {row.styleNo}: try{" "}
                        {splits.map((value, index) => (
                          <span key={value}>
                            {index > 0 && (index === splits.length - 1 ? " or " : ", ")}
                            <button
                              onClick={() =>
                                set({
                                  items: draft.items.map((item) =>
                                    item.product !== null &&
                                    pieceKey({
                                      product: item.product,
                                      part: item.part,
                                    }) === row.key
                                      ? { ...item, quantity: value }
                                      : item,
                                  ),
                                })
                              }
                              className="tabular font-semibold underline underline-offset-2 hover:no-underline"
                            >
                              {value}
                            </button>
                          </span>
                        ))}{" "}
                        per box to use all {row.available}.
                      </p>
                    );
                  })}
                </>
              )}
            </div>
          )}

          <FieldRow className="sm:grid-cols-3">
            <Field label="Code" required error={errors.code || undefined}>
              <Input
                value={draft.code}
                invalid={Boolean(errors.code)}
                onChange={(event) => set({ code: event.target.value })}
                placeholder="TPL-005"
                className="tabular"
              />
            </Field>
            <Field
              label="Name"
              required
              error={errors.name || undefined}
              className="sm:col-span-2"
            >
              <Input
                value={draft.name}
                invalid={Boolean(errors.name)}
                onChange={(event) => set({ name: event.target.value })}
                placeholder="30 bows + 5 wreaths"
              />
            </Field>
          </FieldRow>

          <Field label="Box dimensions (in)">
            <div className="flex items-center gap-2">
              {(["box_length_in", "box_width_in", "box_height_in"] as const).map(
                (key) => (
                  <Input
                    key={key}
                    type="number"
                    step="0.01"
                    value={draft[key] ?? ""}
                    onChange={(event) =>
                      set({ [key]: number(event.target.value) } as Partial<Draft>)
                    }
                    placeholder={
                      key === "box_length_in"
                        ? "L"
                        : key === "box_width_in"
                          ? "W"
                          : "H"
                    }
                    className="tabular text-center"
                  />
                ),
              )}
            </div>
          </Field>

          <FieldRow className="sm:grid-cols-2">
            <Field label="Box weight (kg)" hint="The empty carton alone.">
              <Input
                type="number"
                step="0.001"
                value={draft.box_weight_kg ?? ""}
                onChange={(event) =>
                  set({ box_weight_kg: number(event.target.value) })
                }
                className="tabular"
              />
            </Field>
            <Field
              label="Packing material (kg)"
              hint="Padding inside the box, not the box."
            >
              <Input
                type="number"
                step="0.001"
                value={draft.packing_material_weight_kg ?? ""}
                onChange={(event) =>
                  set({ packing_material_weight_kg: number(event.target.value) })
                }
                className="tabular"
              />
            </Field>
          </FieldRow>

          <Field label="Remark">
            <Textarea
              value={draft.remark}
              onChange={(event) => set({ remark: event.target.value })}
              placeholder="Anything the floor needs to know about packing this box."
              className="min-h-16"
            />
          </Field>

          {/* A one-off is scoped to an order, so it can only be offered when
              there is one to scope it to. */}
          {orderId === undefined ? (
            <p className="rounded-md border border-border bg-secondary/30 px-3 py-2.5 text-xs text-muted-foreground">
              Designs made here go to the library and are offered on every
              order. A one-off needs an order to belong to — write those from
              that order&rsquo;s packing screen.
            </p>
          ) : (
            <label className="flex items-start gap-2.5 rounded-md border border-border bg-secondary/30 px-3 py-2.5">
              <input
                type="checkbox"
                checked={draft.is_library}
                onChange={(event) => set({ is_library: event.target.checked })}
                className="mt-0.5 size-4 accent-[var(--color-primary)]"
              />
              <span className="text-xs leading-relaxed text-secondary-foreground">
                <span className="font-medium text-foreground">
                  Keep for future orders
                </span>
                <br />
                {draft.is_library
                  ? "Offered on every later order too."
                  : "One-off — usable on this order, and offered nowhere else."}
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary
              label="Units"
              value={String(filled.reduce((sum, i) => sum + i.quantity, 0))}
              unit="per box"
            />
            <Summary label="Net" value={format.weight(net)} unit="kg" />
            <Summary label="Gross" value={format.weight(gross)} unit="kg" />
            <Summary label="Volume" value={format.cbm(boxVolume)} unit="CBM" />
          </div>

          {boxVolume > 0 && occupied > 0 && (
            <p
              className={cn(
                "text-xs",
                fill < 0.3 ? "text-warning" : "text-muted-foreground",
              )}
            >
              Contents fill about {Math.round(fill * 100)}% of the box
              {fill < 0.3 && " — the rest is freight paid on air"}.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" onClick={submit} disabled={save.isPending}>
            {save.isPending
              ? "Saving…"
              : template
                ? "Save changes"
                : "Create design"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function seed(template?: PackTemplate, remaining?: QuantityRow[]): Draft {
  if (template) {
    return {
      id: template.id,
      code: template.code,
      name: template.name,
      remark: template.remark,
      box_length_in: template.box_length_in,
      box_width_in: template.box_width_in,
      box_height_in: template.box_height_in,
      box_weight_kg: template.box_weight_kg,
      packing_material_weight_kg: template.packing_material_weight_kg,
      is_library: template.is_library,
      order: template.order,
      items: template.items.map((item) => ({
        product: item.product,
        part: item.part,
        quantity: item.quantity,
      })),
    };
  }

  // Authored from the packing screen: start from what is actually left, so
  // the design is written against the remainder rather than from memory.
  if (remaining && remaining.length > 0) {
    return {
      ...BLANK,
      items: remaining.map((row) => ({
        product: row.product,
        part: row.part,
        quantity: 1,
      })),
    };
  }

  return BLANK;
}

function Summary({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="tabular mt-0.5 text-sm font-semibold text-primary">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}
