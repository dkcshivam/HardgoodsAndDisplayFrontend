"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
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
import {
  PhotoGallery,
  toPending,
  type PendingPhoto,
  type PhotoBinding,
} from "@/components/products/photo-gallery";
import { useCategories, useDisplayPhotoActions, useSave } from "@/lib/queries";
import { cbm, format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import {
  customsErrors,
  hasPhoto,
  missingNumber,
  REQUIRED,
} from "@/lib/required";
import type { DisplayProduct, ProductImage } from "@/types";

type Draft = {
  id?: number;
  style_no: string;
  style_name: string;
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
  images: ProductImage[];
  pending_images: PendingPhoto[];
};

const BLANK: Draft = {
  style_no: "",
  style_name: "",
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
  images: [],
  pending_images: [],
};

interface PhotoState {
  images: ProductImage[];
  pending_images: PendingPhoto[];
}

/** Size and weight, required on whatever piece actually goes in a carton. */
function pieceErrors(piece: {
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  product_weight_kg: number | null;
}): Record<string, string> {
  const found: Record<string, string> = {};
  for (const key of [
    "length_in",
    "width_in",
    "height_in",
    "product_weight_kg",
  ] as const) {
    if (missingNumber(piece[key])) found[key] = REQUIRED;
  }
  return found;
}

/** Photos travel on their own endpoint, so they never ride the product body. */
function withoutPhotos(record: PhotoState): Record<string, unknown> {
  const body: Record<string, unknown> = { ...record };
  delete body.images;
  delete body.pending_images;
  return body;
}

export function DisplayProductForm({
  product,
  seed,
}: {
  product?: DisplayProduct;
  /** Prefilled when an order sheet named a style the app did not have. */
  seed?: { style_no: string; style_name: string };
}) {
  const router = useRouter();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(
    product
      ? {
          ...product,
          category: product.category,
          parts: product.parts.map((part) => ({ ...part, pending_images: [] })),
          pending_images: [],
        }
      : { ...BLANK, ...seed },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Keyed by part index — a part's own missing fields, shown inside its card.
  const [partErrors, setPartErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [uploading, setUploading] = useState(false);

  const categories = useCategories({ is_active: true });
  const save = useSave<Record<string, unknown>, DisplayProduct>(
    "display-products",
  );
  const photos = useDisplayPhotoActions();

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const number = (value: string) => (value === "" ? null : Number(value));

  const setPart = (index: number, patch: Partial<DisplayPartDraft>) =>
    setDraft({
      ...draft,
      parts: draft.parts.map((part, i) =>
        i === index ? { ...part, ...patch } : part,
      ),
    });

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

  const productPhotos = photoBinding("product", draft.id, draft, (update) =>
    setDraft((current) => ({ ...current, ...update(current) })),
  );

  const partPhotos = (index: number) =>
    photoBinding("part", draft.parts[index].id, draft.parts[index], (update) =>
      setDraft((current) => ({
        ...current,
        parts: current.parts.map((part, i) =>
          i === index ? { ...part, ...update(part) } : part,
        ),
      })),
    );

  /** Queued photos can only be sent once their owner has an id. */
  async function uploadQueued(saved: DisplayProduct): Promise<number> {
    const jobs: Promise<unknown>[] = [];
    const previews: string[] = [];

    const queue = (
      photo: PendingPhoto,
      owner: { product?: number; part?: number },
    ) => {
      jobs.push(photos.upload.mutateAsync({ file: photo.file, ...owner }));
      previews.push(photo.preview);
    };

    draft.pending_images.forEach((photo) => queue(photo, { product: saved.id }));
    draft.parts.forEach((part, index) => {
      // Parts come back in the order they were sent.
      const savedPart = saved.parts[index];
      if (savedPart) {
        part.pending_images.forEach((photo) =>
          queue(photo, { part: savedPart.id }),
        );
      }
    });

    if (jobs.length === 0) return 0;

    setUploading(true);
    const results = await Promise.allSettled(jobs);
    previews.forEach(URL.revokeObjectURL);
    setUploading(false);

    return results.filter((result) => result.status === "rejected").length;
  }

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

  async function submit() {
    const found: Record<string, string> = {};
    if (!draft.style_no.trim()) found.style_no = REQUIRED;
    if (!hasPhoto(draft)) found.photos = "Add at least one photo.";

    // A display product owns no box, so what it must answer is its own size
    // and weight — a template cannot check its fit without them. On a
    // multi-part product each part answers separately.
    const foundParts: Record<number, Record<string, string>> = {};
    if (draft.is_multi_part) {
      if (draft.parts.length < 2) {
        found.parts = "At least two parts";
      } else {
        draft.parts.forEach((part, index) => {
          const partFound: Record<string, string> = {
            ...customsErrors(part),
            ...pieceErrors(part),
          };
          if (!part.name.trim()) partFound.name = REQUIRED;
          if (Object.keys(partFound).length > 0) foundParts[index] = partFound;
        });
        if (Object.keys(foundParts).length > 0) {
          const numbers = Object.keys(foundParts).map((i) => Number(i) + 1);
          found.parts = `Part ${numbers.join(", ")} ${
            numbers.length === 1 ? "is" : "are"
          } missing required fields — open ${
            numbers.length === 1 ? "it" : "them"
          } below.`;
        }
      }
    } else {
      Object.assign(found, customsErrors(draft), pieceErrors(draft));
    }

    setErrors(found);
    setPartErrors(foundParts);
    if (Object.keys(found).length > 0) {
      toast.error("Fix the highlighted fields.");
      return;
    }

    const payload: Record<string, unknown> = {
      ...withoutPhotos(draft),
      parts: draft.parts.map((part, index) => ({
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
        toast.success(product ? "Product updated" : "Product created");
      }
      router.push("/display/products");
    } catch (error) {
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
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        <PageHeader
          title={product ? product.style_no : "New display product"}
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

            <FieldRow className="sm:grid-cols-2">
              <Field label="Style name">
                <Input
                  value={draft.style_name}
                  onChange={(event) => set({ style_name: event.target.value })}
                />
              </Field>
              <Field label="Description" error={errors.description || undefined}>
                <Input
                  value={draft.description}
                  invalid={Boolean(errors.description)}
                  onChange={(event) => set({ description: event.target.value })}
                />
              </Field>
            </FieldRow>

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
              <CardTitle>
                Photos<span className="ml-0.5 text-destructive">*</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {errors.photos && (
              <p className="mb-2 text-xs text-destructive">{errors.photos}</p>
            )}
            <PhotoGallery
              {...productPhotos}
              emptyHint={
                draft.is_multi_part
                  ? "A photo of the assembled item, so the packer knows what the parts add up to."
                  : "A photo of the item, so the packer can confirm what is in the carton."
              }
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>How it packs</CardTitle>
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
              required
              error={errors.customs_description || undefined}
            >
              <Input
                value={draft.customs_description}
                invalid={Boolean(errors.customs_description)}
                onChange={(event) =>
                  set({ customs_description: event.target.value })
                }
              />
            </Field>
            <Field
              label="HSN code"
              required
              error={errors.hsn_code || undefined}
            >
              <Input
                value={draft.hsn_code}
                invalid={Boolean(errors.hsn_code)}
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
                  photos={partPhotos(index)}
                  onChange={(patch) => setPart(index, patch)}
                  onRemove={() =>
                    set({ parts: draft.parts.filter((_, i) => i !== index) })
                  }
                  canRemove={draft.parts.length > 2}
                  errors={partErrors[index]}
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
              required
              error={
                errors.length_in || errors.width_in || errors.height_in
                  ? "All three are required."
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                {(["length_in", "width_in", "height_in"] as const).map((key) => (
                  <Input
                    key={key}
                    type="number"
                    step="0.01"
                    invalid={Boolean(errors[key])}
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

            <Field
              label="Product weight (kg)"
              required
              error={errors.product_weight_kg || undefined}
            >
              <Input
                type="number"
                step="0.001"
                invalid={Boolean(errors.product_weight_kg)}
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
          <Button onClick={submit} disabled={save.isPending || uploading}>
            {uploading
              ? "Uploading photos…"
              : save.isPending
                ? "Saving…"
                : product
                  ? "Save changes"
                  : "Create product"}
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
