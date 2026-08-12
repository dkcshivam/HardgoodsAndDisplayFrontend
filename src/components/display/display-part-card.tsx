"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DerivedField, Field, FieldRow } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { cbm, format } from "@/lib/calc";

export interface DisplayPartDraft {
  id?: number;
  name: string;
  description: string;
  customs_description: string;
  hsn_code: string;
  product_weight_kg: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  sort_order: number;
}

export function blankDisplayPart(sortOrder: number): DisplayPartDraft {
  return {
    name: "",
    description: "",
    customs_description: "",
    hsn_code: "",
    product_weight_kg: null,
    length_in: null,
    width_in: null,
    height_in: null,
    sort_order: sortOrder,
  };
}

/** Expands in place — never a dense table, never a page per part. */
export function DisplayPartCard({
  part,
  index,
  onChange,
  onRemove,
  canRemove,
  defaultOpen = false,
}: {
  part: DisplayPartDraft;
  index: number;
  onChange: (patch: Partial<DisplayPartDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const number = (value: string) => (value === "" ? null : Number(value));

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
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
          {part.product_weight_kg !== null && (
            <span className="tabular shrink-0 text-xs text-muted-foreground">
              {format.weight(part.product_weight_kg)} kg
            </span>
          )}
        </button>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${part.name || `part ${index + 1}`}`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-border-subtle px-3.5 py-4">
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
                onChange={(event) => onChange({ description: event.target.value })}
              />
            </Field>
          </FieldRow>

          <FieldRow className="sm:grid-cols-2">
            <Field
              label="Customs description"
              hint="Parts of different materials classify differently."
            >
              <Input
                value={part.customs_description}
                onChange={(event) =>
                  onChange({ customs_description: event.target.value })
                }
              />
            </Field>
            <Field label="HSN code">
              <Input
                value={part.hsn_code}
                onChange={(event) => onChange({ hsn_code: event.target.value })}
                className="tabular"
              />
            </Field>
          </FieldRow>

          <Field label="Dimensions (in)" hint="The part itself, not a box.">
            <div className="flex items-center gap-2">
              {(["length_in", "width_in", "height_in"] as const).map((key) => (
                <Input
                  key={key}
                  type="number"
                  step="0.01"
                  value={part[key] ?? ""}
                  onChange={(event) =>
                    onChange({ [key]: number(event.target.value) })
                  }
                  placeholder={
                    key === "length_in" ? "L" : key === "width_in" ? "W" : "H"
                  }
                  className="tabular text-center"
                />
              ))}
            </div>
          </Field>

          <Field label="Part weight (kg)" hint="The bare part, no packaging.">
            <Input
              type="number"
              step="0.001"
              value={part.product_weight_kg ?? ""}
              onChange={(event) =>
                onChange({ product_weight_kg: number(event.target.value) })
              }
              className="tabular sm:w-48"
            />
          </Field>

          <DerivedField
            label="Part volume"
            value={format.cbm(cbm(part.length_in, part.width_in, part.height_in))}
            unit="CBM"
          />
        </div>
      )}
    </div>
  );
}
