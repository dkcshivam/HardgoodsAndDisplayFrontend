"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Field, FieldRow, DerivedField } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import {
  PackSpecFields,
  BLANK_PACK_SPEC,
  toNumber,
  type PackSpecDraft,
} from "@/components/products/pack-spec-fields";
import {
  PartCard,
  blankPart,
  type PartDraft,
} from "@/components/products/part-card";
import {
  useBoxTypes,
  useCategories,
  useProductGroups,
  useRemove,
  useSave,
} from "@/lib/queries";
import { format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import type { Product, ProductStatus } from "@/types";

export interface ProductDraft extends PackSpecDraft {
  id?: number;
  style_no: string;
  description: string;
  category: number | null;
  product_group: number | null;
  customs_description: string;
  hsn_code: string;
  is_multi_part: boolean;
  is_fragile: boolean;
  status: ProductStatus;
  assembled_length_in: number | null;
  assembled_width_in: number | null;
  assembled_height_in: number | null;
  assembled_weight_kg: number | null;
  pack_per_box: number;
  parts: PartDraft[];
}

export const BLANK_PRODUCT: ProductDraft = {
  style_no: "",
  description: "",
  category: null,
  product_group: null,
  customs_description: "",
  hsn_code: "",
  is_multi_part: false,
  is_fragile: false,
  status: "active",
  assembled_length_in: null,
  assembled_width_in: null,
  assembled_height_in: null,
  assembled_weight_kg: null,
  pack_per_box: 1,
  parts: [],
  ...BLANK_PACK_SPEC,
};

export function toDraft(product: Product): ProductDraft {
  return {
    id: product.id,
    style_no: product.style_no,
    description: product.description,
    category: product.category,
    product_group: product.product_group,
    customs_description: product.customs_description,
    hsn_code: product.hsn_code,
    is_multi_part: product.is_multi_part,
    is_fragile: product.is_fragile,
    status: product.status,
    assembled_length_in: product.assembled_length_in,
    assembled_width_in: product.assembled_width_in,
    assembled_height_in: product.assembled_height_in,
    assembled_weight_kg: product.assembled_weight_kg,
    pack_per_box: product.pack_per_box,
    parts: product.parts.map((part) => ({ ...part })),
    box_type: product.box_type ?? null,
    box_length_in: product.box_length_in ?? null,
    box_width_in: product.box_width_in ?? null,
    box_height_in: product.box_height_in ?? null,
    product_weight_kg: product.product_weight_kg ?? null,
    box_weight_kg: product.box_weight_kg ?? null,
    packing_material_weight_kg: product.packing_material_weight_kg ?? null,
  };
}

export function ProductForm({ initial }: { initial: ProductDraft }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<ProductDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  const boxTypes = useBoxTypes({ is_active: true });
  const categories = useCategories({ is_active: true });
  const groups = useProductGroups();
  const save = useSave<Record<string, unknown>>("products");
  const remove = useRemove("products");

  const set = (patch: Partial<ProductDraft>) =>
    setForm((current) => ({ ...current, ...patch }));

  const setPart = (index: number, patch: Partial<PartDraft>) =>
    setForm((current) => ({
      ...current,
      parts: current.parts.map((part, i) =>
        i === index ? { ...part, ...patch } : part,
      ),
    }));

  // Switching shape clears the half that stops applying, so a stale box
  // never reaches a multi-part product and trips the backend's validation.
  const setShape = (isMultiPart: boolean) =>
    setForm((current) => ({
      ...current,
      is_multi_part: isMultiPart,
      ...(isMultiPart
        ? {
            ...BLANK_PACK_SPEC,
            customs_description: "",
            hsn_code: "",
            pack_per_box: 1,
            parts:
              current.parts.length >= 2
                ? current.parts
                : [blankPart(0), blankPart(1)],
          }
        : { parts: [] }),
    }));

  function submit() {
    const found: Record<string, string> = {};
    if (!form.style_no.trim()) found.style_no = "Required";
    if (!form.description.trim()) found.description = "Required";
    if (form.is_multi_part) {
      if (form.parts.length < 2) found.parts = "A multi-part product needs at least two parts.";
      else if (form.parts.some((part) => !part.name.trim()))
        found.parts = "Every part needs a name.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Fix the highlighted fields.");
      return;
    }

    const payload: Record<string, unknown> = {
      ...form,
      parts: form.parts.map((part, index) => ({ ...part, sort_order: index })),
    };

    save.mutate(payload, {
      onSuccess: () => {
        toast.success(form.id ? "Product saved" : "Product created");
        router.push("/products");
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          setErrors({
            style_no: error.fieldError("style_no") ?? "",
            box_type: error.fieldError("box_type") ?? "",
            parts: error.fieldError("parts") ?? "",
          });
          toast.error(
            error.fieldError("style_no") ??
              error.fieldError("box_type") ??
              error.fieldError("parts") ??
              error.detail,
          );
        } else {
          toast.error("Could not save");
        }
      },
    });
  }

  const totalGross = form.is_multi_part
    ? form.parts.reduce(
        (sum, part) =>
          sum +
          (part.product_weight_kg ?? 0) +
          (part.packing_material_weight_kg ?? 0) +
          (part.box_weight_kg ?? 0),
        0,
      )
    : 0;

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {form.id ? form.style_no || "Product" : "New product"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every field answers one question: how does this go in a box?
            </p>
          </div>
          {form.id && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive-subtle"
              onClick={() => setDeleting(true)}
            >
              <Trash2 /> Delete
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label="Style No" required error={errors.style_no || undefined}>
              <Input
                value={form.style_no}
                invalid={Boolean(errors.style_no)}
                onChange={(event) => set({ style_no: event.target.value })}
                placeholder="DKC-TBL-OAK-01"
                className="tabular"
              />
            </Field>

            <Field
              label="Description"
              required
              error={errors.description || undefined}
              hint="Internal or trade name."
            >
              <Input
                value={form.description}
                invalid={Boolean(errors.description)}
                onChange={(event) => set({ description: event.target.value })}
                placeholder="Oak Dining Table"
              />
            </Field>

            <FieldRow className="sm:grid-cols-2">
              <Field label="Category">
                <Select
                  value={form.category ?? ""}
                  onChange={(event) =>
                    set({ category: toNumber(event.target.value) })
                  }
                >
                  <option value="">None</option>
                  {(categories.data?.results ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Product group">
                <Select
                  value={form.product_group ?? ""}
                  onChange={(event) =>
                    set({ product_group: toNumber(event.target.value) })
                  }
                >
                  <option value="">None</option>
                  {(groups.data?.results ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </FieldRow>

            <FieldRow className="sm:grid-cols-2">
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(event) =>
                    set({ status: event.target.value as ProductStatus })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
              <Field label="Handling">
                <label className="flex h-9 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_fragile}
                    onChange={(event) => set({ is_fragile: event.target.checked })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  Fragile — flag on documents
                </label>
              </Field>
            </FieldRow>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it packs</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ShapeOption
                selected={!form.is_multi_part}
                title="Single box"
                description="The whole item ships in one carton."
                onSelect={() => setShape(false)}
              />
              <ShapeOption
                selected={form.is_multi_part}
                title="Multiple parts"
                description="Ships disassembled, one carton per part."
                onSelect={() => setShape(true)}
              />
            </div>

            {!form.is_multi_part && (
              <Field
                label="Pack per box"
                hint="How many units fit in one carton. Drives carton splitting."
              >
                <Input
                  type="number"
                  min={1}
                  value={form.pack_per_box}
                  onChange={(event) =>
                    set({ pack_per_box: Number(event.target.value) || 1 })
                  }
                  className="sm:w-32"
                />
              </Field>
            )}
          </CardBody>
        </Card>

        {!form.is_multi_part ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Customs</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <Field
                  label="Customs description"
                  hint="Formal name for shipping documents; often differs from the description."
                >
                  <Input
                    value={form.customs_description}
                    onChange={(event) =>
                      set({ customs_description: event.target.value })
                    }
                    placeholder="Wooden Dining Chair"
                  />
                </Field>
                <Field label="HSN code" hint="Determines duty classification.">
                  <Input
                    value={form.hsn_code}
                    onChange={(event) => set({ hsn_code: event.target.value })}
                    placeholder="9401.61"
                    className="tabular sm:w-40"
                  />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>The carton</CardTitle>
              </CardHeader>
              <CardBody>
                <PackSpecFields
                  value={form}
                  onChange={set}
                  boxTypes={boxTypes.data?.results ?? []}
                  idPrefix="product"
                />
              </CardBody>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Assembled reference</CardTitle>
                <span className="text-xs text-muted-foreground">
                  Never used in a calculation
                </span>
              </CardHeader>
              <CardBody className="space-y-4">
                <FieldRow>
                  <Field label="Assembled length (in)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.assembled_length_in ?? ""}
                      onChange={(event) =>
                        set({ assembled_length_in: toNumber(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Assembled width (in)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.assembled_width_in ?? ""}
                      onChange={(event) =>
                        set({ assembled_width_in: toNumber(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Assembled height (in)">
                    <Input
                      type="number"
                      step="0.01"
                      value={form.assembled_height_in ?? ""}
                      onChange={(event) =>
                        set({ assembled_height_in: toNumber(event.target.value) })
                      }
                    />
                  </Field>
                </FieldRow>
                <Field label="Assembled weight (kg)">
                  <Input
                    type="number"
                    step="0.001"
                    value={form.assembled_weight_kg ?? ""}
                    onChange={(event) =>
                      set({ assembled_weight_kg: toNumber(event.target.value) })
                    }
                  />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Parts</CardTitle>
                  {errors.parts && (
                    <p className="mt-0.5 text-xs text-destructive">{errors.parts}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    set({ parts: [...form.parts, blankPart(form.parts.length)] })
                  }
                >
                  <Plus /> Add part
                </Button>
              </CardHeader>
              <CardBody className="space-y-3">
                {form.parts.map((part, index) => (
                  <PartCard
                    key={index}
                    part={part}
                    index={index}
                    boxTypes={boxTypes.data?.results ?? []}
                    defaultOpen={index === 0}
                    canRemove={form.parts.length > 2}
                    onChange={(patch) => setPart(index, patch)}
                    onRemove={() =>
                      set({
                        parts: form.parts.filter((_, i) => i !== index),
                      })
                    }
                  />
                ))}

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <DerivedField
                    label="Cartons per unit"
                    value={String(form.parts.length)}
                    unit="boxes"
                  />
                  <DerivedField
                    label="Total shipping weight"
                    value={format.weight(totalGross)}
                    unit="kg"
                  />
                </div>
              </CardBody>
            </Card>
          </>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push("/products")}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save product"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete product"
        message={`Delete ${form.style_no}? This cannot be undone.`}
        busy={remove.isPending}
        onConfirm={() =>
          form.id &&
          remove.mutate(form.id, {
            onSuccess: () => {
              toast.success("Product deleted");
              router.push("/products");
            },
            onError: () =>
              toast.error("Could not delete — orders still reference it"),
          })
        }
      />
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
