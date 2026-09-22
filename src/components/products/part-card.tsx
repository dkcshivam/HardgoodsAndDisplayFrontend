"use client";

import { useState } from "react";
import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckField, Field, FieldRow } from "@/components/ui/field";
import {
  PackSpecFields,
  toNumber,
  type PackSpecDraft,
} from "@/components/products/pack-spec-fields";
import {
  PhotoGallery,
  type PendingPhoto,
  type PhotoBinding,
} from "@/components/products/photo-gallery";
import { cn } from "@/lib/utils";
import { grossWeight, format } from "@/lib/calc";
import type { ProductImage } from "@/types";

export interface PartDraft extends PackSpecDraft {
  id?: number;
  name: string;
  is_delegate: boolean;
  description: string;
  customs_description: string;
  hsn_code: string;
  hts_code: string;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  sort_order: number;
  images: ProductImage[];
  pending_images: PendingPhoto[];
}

/** Expands in place — never a dense table, never a page per part. */
export function PartCard({
  part,
  index,
  photos,
  onChange,
  onRemove,
  canRemove,
  defaultOpen,
  errors = {},
}: {
  part: PartDraft;
  index: number;
  photos: PhotoBinding;
  onChange: (patch: Partial<PartDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
  defaultOpen?: boolean;
  errors?: Record<string, string>;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  const gross = grossWeight(
    part.product_weight_kg,
    part.packing_material_weight_kg,
    part.box_weight_kg,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 bg-secondary/40 px-3 py-2.5">
        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="truncate text-sm font-medium">
            {part.name || `Part ${index + 1}`}
          </span>
          <span className="tabular shrink-0 text-xs text-muted-foreground">
            {format.weight(gross)} kg gross
          </span>
        </button>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive-subtle"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-border-subtle px-4 py-4">
          <FieldRow className="sm:grid-cols-2">
            <Field label="Part name" required>
              <Input
                value={part.name}
                onChange={(event) => onChange({ name: event.target.value })}
              />
            </Field>
            <Field label="Description">
              <Input
                value={part.description}
                onChange={(event) =>
                  onChange({ description: event.target.value })
                }
              />
            </Field>
            <CheckField
              label="Delegate"
              checked={part.is_delegate}
              onChange={(next) => onChange({ is_delegate: next })}
            />
          </FieldRow>

          <Field label="Customs description">
            <Input
              value={part.customs_description}
              onChange={(event) =>
                onChange({ customs_description: event.target.value })
              }
            />
          </Field>
          <FieldRow className="sm:grid-cols-2">
            <Field label="HSN code">
              <Input
                value={part.hsn_code}
                onChange={(event) => onChange({ hsn_code: event.target.value })}
                className="tabular"
              />
            </Field>
            <Field label="HTS code">
              <Input
                value={part.hts_code}
                onChange={(event) => onChange({ hts_code: event.target.value })}
                className="tabular"
              />
            </Field>
          </FieldRow>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Photos of this part
            </div>
            <PhotoGallery
              {...photos}
              emptyHint=""
            />
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Part dimensions
            </div>
            <FieldRow>
              <Field label="Length (in)">
                <Input
                  type="number"
                  step="0.01"
                  value={part.length_in ?? ""}
                  onChange={(event) =>
                    onChange({ length_in: toNumber(event.target.value) })
                  }
                />
              </Field>
              <Field label="Width (in)">
                <Input
                  type="number"
                  step="0.01"
                  value={part.width_in ?? ""}
                  onChange={(event) =>
                    onChange({ width_in: toNumber(event.target.value) })
                  }
                />
              </Field>
              <Field label="Height (in)">
                <Input
                  type="number"
                  step="0.01"
                  value={part.height_in ?? ""}
                  onChange={(event) =>
                    onChange({ height_in: toNumber(event.target.value) })
                  }
                />
              </Field>
            </FieldRow>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Carton dimensions
            </div>
            <PackSpecFields
              value={part}
              onChange={onChange}
              idPrefix={`part-${index}`}
              subject="part"
              errors={errors}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function blankPart(sortOrder: number): PartDraft {
  return {
    name: "",
    is_delegate: false,
    description: "",
    customs_description: "",
    hsn_code: "",
    hts_code: "",
    length_in: null,
    width_in: null,
    height_in: null,
    sort_order: sortOrder,
    images: [],
    pending_images: [],
    box_length_in: null,
    box_width_in: null,
    box_height_in: null,
    product_weight_kg: null,
    box_weight_kg: null,
    packing_material_weight_kg: null,
  };
}
