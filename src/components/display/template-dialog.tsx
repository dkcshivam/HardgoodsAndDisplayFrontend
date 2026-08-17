"use client";

import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogRoot,
  DialogContent,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FieldRow } from "@/components/ui/field";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/components/ui/toast";
import { useDisplayProducts, useSave } from "@/lib/queries";
import {
  cbm,
  format,
  maxApplications,
  mixedCartonGrossWeight,
  mixedCartonNetWeight,
  pieceKey,
} from "@/lib/calc";
import { ApiError } from "@/lib/api";
import { cn, matchesTerms, searchTerms } from "@/lib/utils";
import type { DisplayProduct, PackTemplate, QuantityRow } from "@/types";

/** One row of the piece table — a whole product, or one part of one. */
interface PieceRow {
  product: number;
  part: number | null;
  label: string;
  /** The buyer's name for the style. Blank on plenty of products. */
  styleName: string;
  partName: string;
  /** Searched alongside the label, so "garden arch" finds DSP-ARC-84. */
  description: string;
  /** Set only when designing against an order's remaining demand. */
  before?: number;
}

interface Draft {
  id?: number;
  name: string;
  /** Once the name is typed in, it stops following the pieces. Emptying it resumes. */
  nameTouched: boolean;
  remark: string;
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
  box_weight_kg: number | null;
  packing_material_weight_kg: number | null;
  is_library: boolean;
  order: number | null;
  /** Quantity per box, keyed by piece. A piece absent or at 0 is not in the design. */
  quantities: Record<string, number>;
}

const BLANK: Draft = {
  name: "",
  nameTouched: false,
  remark: "",
  box_length_in: null,
  box_width_in: null,
  box_height_in: null,
  box_weight_kg: null,
  packing_material_weight_kg: null,
  is_library: true,
  order: null,
  quantities: {},
};

/**
 * Designing a box. Opened from an order's packing screen against whatever is
 * left, which is why it takes `remaining` — and why every row previews what
 * choosing a quantity would leave behind.
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
  const save = useSave<Record<string, unknown>, PackTemplate>("pack-templates");

  const catalogue = products.data?.results ?? [];

  const [draft, setDraft] = useState<Draft>(() => seed(template));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [subject, setSubject] = useState(template?.id ?? null);
  const [everOpen, setEverOpen] = useState(open);
  // Hides the "Fits N×" line while a qty is mid-edit, so it doesn't flicker
  // through half-typed numbers — it settles once you tab or click away.
  const [typingRow, setTypingRow] = useState<string | null>(null);
  const [pieceSearch, setPieceSearch] = useState("");
  if (open && (!everOpen || subject !== (template?.id ?? null))) {
    setSubject(template?.id ?? null);
    setDraft(seed(template));
    setErrors({});
    setPieceSearch("");
  }
  if (everOpen !== open) setEverOpen(open);

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const number = (value: string) => (value === "" ? null : Number(value));

  const setQuantity = (row: PieceRow, quantity: number) =>
    setDraft({
      ...draft,
      quantities: { ...draft.quantities, [pieceKey(row)]: Math.max(0, quantity) },
    });

  // Every candidate piece for this box: whatever the order still needs, or —
  // designing outside an order — the whole active catalogue exploded into
  // pieces. Nothing to add or remove; a quantity of 0 just means "not in this
  // box".
  // The order's remaining rows carry no style name, so it comes from the
  // catalogue already loaded here rather than widening that endpoint.
  const styleNames = new Map(catalogue.map((item) => [item.id, item.style_name]));

  const candidateRows: PieceRow[] = remaining
    ? remaining.map((row) => ({
        product: row.product,
        part: row.part,
        label: pieceLabel(row.style_no, row.part_name),
        styleName: styleNames.get(row.product) ?? "",
        partName: row.part_name,
        description: row.description,
        before: row.quantity,
      }))
    : catalogRows(catalogue, template);

  const terms = searchTerms(pieceSearch);
  const visibleRows = terms.length
    ? candidateRows.filter((row) =>
        matchesTerms(`${row.label} ${row.styleName} ${row.description}`, terms),
      )
    : candidateRows;

  const productOf = (id: number) => catalogue.find((p) => p.id === id);

  /** The part a row names, or the product itself when it is one piece. */
  const pieceOf = (row: { product: number; part: number | null }) => {
    const product = productOf(row.product);
    if (!product) return undefined;
    return row.part === null
      ? product
      : product.parts.find((part) => part.id === row.part);
  };

  const filled = candidateRows
    .map((row) => ({ ...row, quantity: draft.quantities[pieceKey(row)] ?? 0 }))
    .filter((row) => row.quantity > 0);

  // The name is what everyone reads to tell two designs apart, and typing it
  // by hand after choosing the pieces only ever restated them.
  const autoName = composeName(filled);
  const name = draft.nameTouched ? draft.name : autoName;

  const left = new Map(
    (remaining ?? []).map((row) => [pieceKey(row), row.quantity]),
  );
  const fits = remaining ? maxApplications(filled, left) : null;

  /** What choosing this row's quantity would leave behind, at `fits`×. */
  function afterQuantity(row: PieceRow, quantity: number): number | undefined {
    if (row.before === undefined || fits === null || quantity === 0) {
      return row.before;
    }
    return row.before - quantity * fits;
  }

  const leavesSomething = filled.some(
    (row) => (afterQuantity(row, row.quantity) ?? 0) > 0,
  );

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
    if (!name.trim()) found.name = "Required";
    if (filled.length === 0) found.items = "Give at least one piece a quantity.";

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
        id: draft.id,
        // No code — the server assigns T-001, T-002 … on create and keeps
        // whatever it assigned on edit.
        name,
        remark: draft.remark,
        box_length_in: draft.box_length_in,
        box_width_in: draft.box_width_in,
        box_height_in: draft.box_height_in,
        box_weight_kg: draft.box_weight_kg,
        packing_material_weight_kg: draft.packing_material_weight_kg,
        is_library: library,
        order: library ? null : (orderId ?? null),
        items: filled.map(({ product, part, quantity }) => ({
          product,
          part,
          quantity,
        })),
      },
      {
        onSuccess: (saved) => {
          toast.success(template ? "Design updated" : `${saved.code} created`);
          onOpenChange(false);
          onSaved?.(saved);
        },
        onError: (error) => {
          if (error instanceof ApiError) {
            const field = error.fieldError("name");
            if (field) setErrors({ name: field });
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
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-secondary-foreground">
                What goes in the box
              </span>
              <div className="flex items-center gap-3">
                {candidateRows.length > 6 && (
                  <SearchInput
                    value={pieceSearch}
                    onChange={setPieceSearch}
                    placeholder="Search pieces…"
                  />
                )}
                {fits !== null && filled.length > 0 && typingRow === null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-semibold",
                      fits === 0
                        ? "text-warning"
                        : leavesSomething
                          ? "text-warning"
                          : "text-success",
                    )}
                  >
                    {fits === 0 ? (
                      <>
                        <TriangleAlert className="size-3.5" />
                        Doesn&rsquo;t fit yet
                      </>
                    ) : leavesSomething ? (
                      <>
                        <TriangleAlert className="size-3.5" />
                        Fits {fits}× — leaves some behind
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5" />
                        Fits {fits}× — uses every one
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>

            {candidateRows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                No active display products yet — add one first.
              </p>
            ) : visibleRows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                No piece matches &ldquo;{pieceSearch.trim()}&rdquo;.
              </p>
            ) : (
              // Capped so the box dimensions and weights below stay reachable
              // without scrolling past a catalogue of a hundred pieces.
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border-subtle bg-secondary text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Piece</th>
                      {remaining && (
                        <th className="px-3 py-2 text-right font-medium">
                          Still needed
                        </th>
                      )}
                      <th className="w-24 px-3 py-2 text-right font-medium">
                        Qty / box
                      </th>
                      {remaining && (
                        <th className="w-24 px-3 py-2 text-right font-medium">
                          Leaves
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => {
                      const key = pieceKey(row);
                      const quantity = draft.quantities[key] ?? 0;
                      const after = afterQuantity(row, quantity);
                      return (
                        <tr
                          key={key}
                          className="border-b border-border-subtle last:border-0"
                        >
                          <td className="px-3 py-2">
                            <span className="tabular">{row.label}</span>
                            {row.styleName && (
                              <span className="ml-2 text-muted-foreground">
                                {row.styleName}
                              </span>
                            )}
                          </td>
                          {remaining && (
                            <td className="tabular px-3 py-2 text-right text-muted-foreground">
                              {row.before}
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-right">
                            <Input
                              type="number"
                              min={0}
                              // Blank rather than a literal 0, so typing 12
                              // does not read as "012".
                              value={quantity === 0 ? "" : quantity}
                              placeholder="0"
                              onChange={(event) =>
                                setQuantity(row, Number(event.target.value) || 0)
                              }
                              onFocus={() => setTypingRow(key)}
                              onBlur={() =>
                                setTypingRow((current) =>
                                  current === key ? null : current,
                                )
                              }
                              className="tabular h-8 w-20 text-right"
                            />
                          </td>
                          {remaining && (
                            <td
                              className={cn(
                                "tabular px-3 py-2 text-right font-medium",
                                quantity > 0 && (after ?? 0) > 0
                                  ? "text-warning"
                                  : "text-muted-foreground",
                              )}
                            >
                              {quantity > 0 ? after : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {errors.items && (
              <p className="mt-1.5 text-xs text-destructive">{errors.items}</p>
            )}
          </div>

          <Field
            label="Name"
            required
            error={errors.name || undefined}
            hint={
              draft.nameTouched
                ? "Clear it to go back to naming itself from the pieces."
                : "Names itself from the pieces above — type to override."
            }
          >
            <Input
              value={name}
              invalid={Boolean(errors.name)}
              placeholder="Give the pieces above a quantity"
              onChange={(event) =>
                set({
                  name: event.target.value,
                  nameTouched: event.target.value.trim() !== "",
                })
              }
            />
          </Field>

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
                fill > 1 || fill < 0.3 ? "text-warning" : "text-muted-foreground",
              )}
            >
              {/* Over 100% is not a fill level — it means the box is too small
                  for what was typed, and a percentage reads as nonsense. */}
              {fill > 1 ? (
                <>
                  Contents come to {format.cbm(occupied)} CBM but the box holds{" "}
                  {format.cbm(boxVolume)} CBM — they will not fit. Check the
                  box dimensions.
                </>
              ) : (
                <>
                  Contents fill about {Math.round(fill * 100)}% of the box
                  {fill < 0.3 && " — the rest is freight paid on air"}.
                </>
              )}
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

function pieceLabel(styleNo: string, partName: string): string {
  return partName ? `${styleNo} — ${partName}` : styleNo;
}

/** `name` on PackTemplate. Longer than this and the API rejects the save. */
const NAME_LIMIT = 180;

/**
 * The design's name, written from what is in the box: "Garden Arch * Pine
 * Wreath". Parts are named too — two parts of one product are two different
 * things to pack, and collapsing them to one style name would hide that.
 */
function composeName(pieces: PieceRow[]): string {
  const seen = new Set<string>();
  for (const piece of pieces) {
    const style = piece.styleName || piece.label;
    seen.add(piece.partName ? `${style} — ${piece.partName}` : style);
  }

  const parts = [...seen];
  let name = parts.join(" * ");
  // Fifty pieces would run past the column the API accepts, so the tail
  // becomes a count rather than being cut mid-word.
  for (let kept = parts.length - 1; name.length > NAME_LIMIT && kept > 0; kept--) {
    name = `${parts.slice(0, kept).join(" * ")} + ${parts.length - kept} more`;
  }
  return name.slice(0, NAME_LIMIT);
}

/**
 * The full active catalogue, one row per piece — a whole product, or every
 * part of a multi-part one. Falls back to a saved template's own item labels
 * for a piece the active catalogue no longer lists (its product deactivated
 * since), so editing never silently drops a row.
 */
function catalogRows(catalogue: DisplayProduct[], template?: PackTemplate): PieceRow[] {
  const rows: PieceRow[] = catalogue.flatMap((product): PieceRow[] =>
    product.is_multi_part
      ? product.parts.map((part) => ({
          product: product.id,
          part: part.id,
          label: pieceLabel(product.style_no, part.name),
          styleName: product.style_name,
          partName: part.name,
          description: part.description || product.description,
        }))
      : [
          {
            product: product.id,
            part: null,
            label: product.style_no,
            styleName: product.style_name,
            partName: "",
            description: product.description,
          },
        ],
  );

  if (template) {
    const known = new Set(rows.map(pieceKey));
    for (const item of template.items) {
      const key = pieceKey(item);
      if (!known.has(key)) {
        rows.push({
          product: item.product,
          part: item.part,
          label: pieceLabel(item.product_style_no, item.part_name),
          // A deactivated product is off the catalogue, so its style name is
          // no longer to hand — the style number still identifies the row.
          styleName: "",
          partName: item.part_name,
          description: "",
        });
        known.add(key);
      }
    }
  }

  return rows;
}

function seed(template?: PackTemplate): Draft {
  if (!template) return BLANK;

  const quantities: Record<string, number> = {};
  for (const item of template.items) {
    quantities[pieceKey(item)] = item.quantity;
  }

  return {
    id: template.id,
    name: template.name,
    // A saved name is left alone — it may well have been written by hand, and
    // there is no way to tell from here.
    nameTouched: true,
    remark: template.remark,
    box_length_in: template.box_length_in,
    box_width_in: template.box_width_in,
    box_height_in: template.box_height_in,
    box_weight_kg: template.box_weight_kg,
    packing_material_weight_kg: template.packing_material_weight_kg,
    is_library: template.is_library,
    order: template.order,
    quantities,
  };
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
