"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Field, FieldRow } from "@/components/ui/field";
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
  PhotoGallery,
  toPending,
  type PendingPhoto,
  type PhotoBinding,
} from "@/components/products/photo-gallery";
import { useCategories, usePhotoActions, useRemove, useSave } from "@/lib/queries";
import { cbm, grossWeight, format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import type { Product, ProductImage, ProductStatus } from "@/types";

export interface ProductDraft extends PackSpecDraft {
  id?: number;
  style_no: string;
  description: string;
  category: number | null;
  customs_description: string;
  hsn_code: string;
  is_multi_part: boolean;
  status: ProductStatus;
  assembled_length_in: number | null;
  assembled_width_in: number | null;
  assembled_height_in: number | null;
  assembled_weight_kg: number | null;
  pack_per_box: number;
  parts: PartDraft[];
  images: ProductImage[];
  pending_images: PendingPhoto[];
}

export const BLANK_PRODUCT: ProductDraft = {
  style_no: "",
  description: "",
  category: null,
  customs_description: "",
  hsn_code: "",
  is_multi_part: false,
  status: "active",
  assembled_length_in: null,
  assembled_width_in: null,
  assembled_height_in: null,
  assembled_weight_kg: null,
  pack_per_box: 1,
  parts: [],
  images: [],
  pending_images: [],
  ...BLANK_PACK_SPEC,
};

export function toDraft(product: Product): ProductDraft {
  return {
    id: product.id,
    style_no: product.style_no,
    description: product.description,
    category: product.category,
    customs_description: product.customs_description,
    hsn_code: product.hsn_code,
    is_multi_part: product.is_multi_part,
    status: product.status,
    assembled_length_in: product.assembled_length_in,
    assembled_width_in: product.assembled_width_in,
    assembled_height_in: product.assembled_height_in,
    assembled_weight_kg: product.assembled_weight_kg,
    pack_per_box: product.pack_per_box,
    parts: product.parts.map((part) => ({ ...part, pending_images: [] })),
    images: product.images,
    pending_images: [],
    box_length_in: product.box_length_in ?? null,
    box_width_in: product.box_width_in ?? null,
    box_height_in: product.box_height_in ?? null,
    product_weight_kg: product.product_weight_kg ?? null,
    box_weight_kg: product.box_weight_kg ?? null,
    packing_material_weight_kg: product.packing_material_weight_kg ?? null,
  };
}

interface PhotoState {
  images: ProductImage[];
  pending_images: PendingPhoto[];
}

/** Photos travel on their own endpoint, so they never ride the product body. */
function withoutPhotos(record: PhotoState): Record<string, unknown> {
  const body: Record<string, unknown> = { ...record };
  delete body.images;
  delete body.pending_images;
  return body;
}

export function ProductForm({ initial }: { initial: ProductDraft }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<ProductDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categories = useCategories({ is_active: true });
  const save = useSave<Record<string, unknown>, Product>("products");
  const remove = useRemove("products");
  const photos = usePhotoActions();

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
  // Only reachable before the first save — after that the shape is fixed.
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

  /**
   * A photo needs an owner row to point at, so one that already exists
   * uploads straight away and one that does not queues until save.
   */
  function photoBinding(
    field: "product" | "part",
    ownerId: number | undefined,
    state: PhotoState,
    apply: (update: (owner: PhotoState) => Partial<PhotoState>) => void,
  ): PhotoBinding {
    return {
      images: state.images,
      pending: state.pending_images,

      onAdd: (files) => {
        if (!ownerId) {
          const queued = files.map(toPending);
          apply((owner) => ({
            pending_images: [...owner.pending_images, ...queued],
          }));
          return;
        }
        for (const file of files) {
          photos.upload.mutate(
            field === "product"
              ? { file, product: ownerId }
              : { file, part: ownerId },
            {
              onSuccess: (image) =>
                apply((owner) => ({ images: [...owner.images, image] })),
              onError: () => toast.error("Could not upload that photo"),
            },
          );
        }
      },

      onRemovePending: (key) =>
        apply((owner) => {
          const going = owner.pending_images.find((photo) => photo.key === key);
          if (going) URL.revokeObjectURL(going.preview);
          return {
            pending_images: owner.pending_images.filter(
              (photo) => photo.key !== key,
            ),
          };
        }),

      onRemoveImage: (id) =>
        photos.remove.mutate(id, {
          onSuccess: () =>
            apply((owner) => ({
              images: owner.images.filter((image) => image.id !== id),
            })),
          onError: () => toast.error("Could not remove that photo"),
        }),

      onSetMain: (id) =>
        photos.setMain.mutate(id, {
          onSuccess: () =>
            apply((owner) => ({
              images: owner.images.map((image) => ({
                ...image,
                is_main: image.id === id,
              })),
            })),
          onError: () => toast.error("Could not set the main photo"),
        }),
    };
  }

  const productPhotos = photoBinding("product", form.id, form, (update) =>
    setForm((current) => ({ ...current, ...update(current) })),
  );

  const partPhotos = (index: number) =>
    photoBinding("part", form.parts[index].id, form.parts[index], (update) =>
      setForm((current) => ({
        ...current,
        parts: current.parts.map((part, i) =>
          i === index ? { ...part, ...update(part) } : part,
        ),
      })),
    );

  /** Queued photos can only be sent once their owner has an id. */
  async function uploadQueued(saved: Product): Promise<number> {
    const jobs: Promise<unknown>[] = [];
    const previews: string[] = [];

    const queue = (
      photo: PendingPhoto,
      owner: { product?: number; part?: number },
    ) => {
      jobs.push(photos.upload.mutateAsync({ file: photo.file, ...owner }));
      previews.push(photo.preview);
    };

    form.pending_images.forEach((photo) => queue(photo, { product: saved.id }));
    form.parts.forEach((part, index) => {
      // Parts come back in the order they were sent.
      const savedPart = saved.parts[index];
      if (savedPart) {
        part.pending_images.forEach((photo) => queue(photo, { part: savedPart.id }));
      }
    });

    if (jobs.length === 0) return 0;

    setUploading(true);
    const results = await Promise.allSettled(jobs);
    previews.forEach(URL.revokeObjectURL);
    setUploading(false);

    return results.filter((result) => result.status === "rejected").length;
  }

  async function submit() {
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
      ...withoutPhotos(form),
      parts: form.parts.map((part, index) => ({
        ...withoutPhotos(part),
        sort_order: index,
      })),
    };

    try {
      const saved = await save.mutateAsync(payload);
      const failed = await uploadQueued(saved);

      if (failed > 0) {
        toast.error(
          `Product saved, but ${failed} photo${failed > 1 ? "s" : ""} did not upload.`,
        );
      } else {
        toast.success(form.id ? "Product saved" : "Product created");
      }
      router.push("/products");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          style_no: error.fieldError("style_no") ?? "",
          parts: error.fieldError("parts") ?? "",
        });
        toast.error(
          error.fieldError("style_no") ??
            error.fieldError("is_multi_part") ??
            error.fieldError("parts") ??
            error.detail,
        );
      } else {
        toast.error("Could not save");
      }
    }
  }

  const totalGross = form.parts.reduce(
    (sum, part) =>
      sum +
      grossWeight(
        part.product_weight_kg,
        part.packing_material_weight_kg,
        part.box_weight_kg,
      ),
    0,
  );
  const totalCbm = form.parts.reduce(
    (sum, part) =>
      sum + cbm(part.box_length_in, part.box_width_in, part.box_height_in),
    0,
  );

  const busy = save.isPending || uploading;

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
                  onChange={(event) => set({ category: toNumber(event.target.value) })}
                >
                  <option value="">None</option>
                  {(categories.data?.results ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
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
            </FieldRow>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it packs</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {form.id ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/40 px-3.5 py-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">
                    {form.is_multi_part ? "Multiple parts" : "Single box"}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Fixed when the product was created. Every carton and weight
                    already worked out from this style number assumes it — for a
                    different shape, create a new style number.
                  </p>
                </div>
              </div>
            ) : (
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
            )}

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

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Photos</CardTitle>
              <CardDescription>
                {form.id
                  ? "Saved as soon as you add them."
                  : "Uploaded when you save the product."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <PhotoGallery
              {...productPhotos}
              emptyHint={
                form.is_multi_part
                  ? "A photo of the assembled item, so the packer knows what the parts add up to."
                  : "A photo of the item, so the packer can confirm what is in the carton."
              }
            />
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
                <PackSpecFields value={form} onChange={set} idPrefix="product" />
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
                    key={part.id ?? `new-${index}`}
                    part={part}
                    index={index}
                    photos={partPhotos(index)}
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

                <ShipsAsSummary
                  cartons={form.parts.length}
                  grossKg={totalGross}
                  volumeCbm={totalCbm}
                />
              </CardBody>
            </Card>
          </>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push("/products")}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save product"}
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

/** The totals the parts above add up to. Tinted so it reads as an answer,
 *  not another thing to fill in. */
function ShipsAsSummary({
  cartons,
  grossKg,
  volumeCbm,
}: {
  cartons: number;
  grossKg: number;
  volumeCbm: number;
}) {
  return (
    <div className="mt-1 rounded-lg border border-primary/25 bg-primary-subtle px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        One of this product ships as
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <SummaryStat
          label="Cartons per product"
          value={String(cartons)}
          unit={cartons === 1 ? "box" : "boxes"}
        />
        <SummaryStat
          label="Total shipping weight"
          value={format.weight(grossKg)}
          unit="kg"
        />
        <SummaryStat
          label="Total volume"
          value={format.cbm(volumeCbm)}
          unit="CBM"
        />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-md border border-primary/15 bg-card px-3 py-2">
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
