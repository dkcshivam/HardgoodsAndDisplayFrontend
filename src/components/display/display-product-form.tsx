"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { DerivedField, Field, FieldRow } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  DisplayPartCard,
  blankDisplayPart,
  type DisplayPartDraft,
} from "@/components/display/display-part-card";
import { useCategories, useSave } from "@/lib/queries";
import { cbm, format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import type { DisplayProduct } from "@/types";

type Draft = {
  id?: number;
  style_no: string;
  description: string;
  category: number | null;
  customs_description: string;
  hsn_code: string;
  is_multi_part: boolean;
  status: "active" | "inactive";
  product_weight_kg: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  parts: DisplayPartDraft[];
};

const BLANK: Draft = {
  style_no: "",
  description: "",
  category: null,
  customs_description: "",
  hsn_code: "",
  is_multi_part: false,
  status: "active",
  product_weight_kg: null,
  length_in: null,
  width_in: null,
  height_in: null,
  parts: [],
};

export function DisplayProductForm({ product }: { product?: DisplayProduct }) {
  const router = useRouter();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(
    product ? { ...product, category: product.category } : BLANK,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = useCategories({ is_active: true });
  const save = useSave<Draft, DisplayProduct>("display-products");

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const number = (value: string) => (value === "" ? null : Number(value));

  const setPart = (index: number, patch: Partial<DisplayPartDraft>) =>
    setDraft({
      ...draft,
      parts: draft.parts.map((part, i) =>
        i === index ? { ...part, ...patch } : part,
      ),
    });

  /** Only reachable before the first save — after that the shape is fixed. */
  function setShape(multi: boolean) {
    setDraft({
      ...draft,
      is_multi_part: multi,
      // A multi-part product is never handled whole, so its own figures go.
      ...(multi
        ? {
            product_weight_kg: null,
            length_in: null,
            width_in: null,
            height_in: null,
            parts:
              draft.parts.length > 0
                ? draft.parts
                : [blankDisplayPart(0), blankDisplayPart(1)],
          }
        : { parts: [] }),
    });
  }

  function submit() {
    const found: Record<string, string> = {};
    if (!draft.style_no.trim()) found.style_no = "Required";
    if (!draft.description.trim()) found.description = "Required";
    if (draft.is_multi_part) {
      if (draft.parts.length < 2) found.parts = "At least two parts";
      else if (draft.parts.some((part) => !part.name.trim()))
        found.parts = "Every part needs a name";
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Fix the highlighted fields.");
      return;
    }

    const payload = {
      ...draft,
      parts: draft.parts.map((part, index) => ({ ...part, sort_order: index })),
    };

    save.mutate(payload, {
      onSuccess: () => {
        toast.success(product ? "Product updated" : "Product created");
        router.push("/display/products");
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          const style = error.fieldError("style_no");
          const parts = error.fieldError("parts");
          setErrors({ style_no: style ?? "", parts: parts ?? "" });
          toast.error(
            style ??
              parts ??
              error.fieldError("is_multi_part") ??
              error.fieldError("product_weight_kg") ??
              error.detail,
          );
        } else {
          toast.error("Could not save the product");
        }
      },
    });
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        <PageHeader
          title={product ? product.style_no : "New display product"}
          description="A display item has no box of its own — the pack template carries it."
        />

        <Card>
          <CardHeader>
            <CardTitle>Item</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <FieldRow className="sm:grid-cols-2">
              <Field label="Style No" required error={errors.style_no || undefined}>
                <Input
                  value={draft.style_no}
                  invalid={Boolean(errors.style_no)}
                  onChange={(event) => set({ style_no: event.target.value })}
                  className="tabular"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={draft.status}
                  onChange={(event) =>
                    set({ status: event.target.value as Draft["status"] })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </FieldRow>

            <Field
              label="Description"
              required
              error={errors.description || undefined}
            >
              <Input
                value={draft.description}
                invalid={Boolean(errors.description)}
                onChange={(event) => set({ description: event.target.value })}
              />
            </Field>

            <Field label="Category">
              <Select
                value={draft.category ?? ""}
                onChange={(event) =>
                  set({ category: number(event.target.value) })
                }
              >
                <option value="">No category</option>
                {(categories.data?.results ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>How it packs</CardTitle>
              <CardDescription>
                Parts are packed separately, and may go into different
                templates.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {draft.id ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/40 px-3.5 py-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {draft.is_multi_part
                      ? `${draft.parts.length} parts`
                      : "Single piece"}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Fixed when the product was created. Every template and
                    carton already written against this style number assumes it
                    — for a different shape, create a new style number.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ShapeOption
                  selected={!draft.is_multi_part}
                  title="Single piece"
                  description="The whole item goes into a template's carton."
                  onSelect={() => setShape(false)}
                />
                <ShapeOption
                  selected={draft.is_multi_part}
                  title="Several parts"
                  description="Each part is packed on its own, possibly in a different template."
                  onSelect={() => setShape(true)}
                />
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customs</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="Customs description"
              hint="The formal name for shipping documents; often differs from the description."
            >
              <Input
                value={draft.customs_description}
                onChange={(event) =>
                  set({ customs_description: event.target.value })
                }
              />
            </Field>
            <Field label="HSN code">
              <Input
                value={draft.hsn_code}
                onChange={(event) => set({ hsn_code: event.target.value })}
                className="tabular sm:w-40"
              />
            </Field>
          </CardBody>
        </Card>

        {draft.is_multi_part ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Parts</CardTitle>
                <CardDescription>
                  Each part carries its own weight, size and customs details.
                </CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  set({
                    parts: [...draft.parts, blankDisplayPart(draft.parts.length)],
                  })
                }
              >
                <Plus /> Add part
              </Button>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {errors.parts && (
                <p className="text-xs text-destructive">{errors.parts}</p>
              )}
              {draft.parts.map((part, index) => (
                <DisplayPartCard
                  key={part.id ?? `new-${index}`}
                  part={part}
                  index={index}
                  defaultOpen={!part.id}
                  onChange={(patch) => setPart(index, patch)}
                  onRemove={() =>
                    set({ parts: draft.parts.filter((_, i) => i !== index) })
                  }
                  canRemove={draft.parts.length > 2}
                />
              ))}
              <DerivedField
                label="Cartons this product needs"
                value={String(draft.parts.length)}
                unit={draft.parts.length === 1 ? "place" : "places"}
              />
            </CardBody>
          </Card>
        ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Size and weight</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="Dimensions (in)"
              hint="The item itself. Used for customs and to warn when a template's box is mostly air."
            >
              <div className="flex items-center gap-2">
                {(["length_in", "width_in", "height_in"] as const).map((key) => (
                  <Input
                    key={key}
                    type="number"
                    step="0.01"
                    value={draft[key] ?? ""}
                    onChange={(event) =>
                      set({ [key]: number(event.target.value) } as Partial<Draft>)
                    }
                    placeholder={key === "length_in" ? "L" : key === "width_in" ? "W" : "H"}
                    className="tabular text-center"
                  />
                ))}
              </div>
            </Field>

            <Field label="Product weight (kg)" hint="The bare item, no packaging.">
              <Input
                type="number"
                step="0.001"
                value={draft.product_weight_kg ?? ""}
                onChange={(event) =>
                  set({ product_weight_kg: number(event.target.value) })
                }
                className="tabular sm:w-48"
              />
            </Field>

            <DerivedField
              label="Item volume"
              value={format.cbm(
                cbm(draft.length_in, draft.width_in, draft.height_in),
              )}
              unit="CBM"
            />
          </CardBody>
        </Card>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/display/products")}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function ShapeOption({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "rounded-lg border px-3.5 py-3 text-left transition-colors " +
        (selected
          ? "border-primary bg-primary-subtle"
          : "border-border hover:border-primary/40 hover:bg-accent")
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            "size-3.5 rounded-full border-[4px] " +
            (selected ? "border-primary" : "border-input")
          }
        />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="mt-1 pl-5.5 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
