"use client";

import { Input } from "@/components/ui/input";
import { Field, FieldRow, DerivedField } from "@/components/ui/field";
import { cbm, grossWeight, netWeight, format } from "@/lib/calc";

export interface PackSpecDraft {
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
  product_weight_kg: number | null;
  box_weight_kg: number | null;
  packing_material_weight_kg: number | null;
}

export const BLANK_PACK_SPEC: PackSpecDraft = {
  box_length_in: null,
  box_width_in: null,
  box_height_in: null,
  product_weight_kg: null,
  box_weight_kg: null,
  packing_material_weight_kg: null,
};

/**
 * The box-and-weight block, identical on a single-box product and on every
 * part. Weights each get their own row; dimensions share one.
 *
 * `subject` only names what is being weighed — inside a part card the same
 * column is the weight of that part, not of the whole product.
 */
export function PackSpecFields({
  value,
  onChange,
  idPrefix,
  subject = "product",
  errors = {},
}: {
  value: PackSpecDraft;
  onChange: (patch: Partial<PackSpecDraft>) => void;
  idPrefix: string;
  subject?: "product" | "part";
  errors?: Record<string, string>;
}) {
  const net = netWeight(value.product_weight_kg, value.packing_material_weight_kg);
  const gross = grossWeight(
    value.product_weight_kg,
    value.packing_material_weight_kg,
    value.box_weight_kg,
  );
  const volume = cbm(value.box_length_in, value.box_width_in, value.box_height_in);

  return (
    <div className="space-y-4">
      <FieldRow>
        <Field
          label="Box length (in)"
          htmlFor={`${idPrefix}-l`}
          required
          error={errors.box_length_in || undefined}
        >
          <Input
            id={`${idPrefix}-l`}
            type="number"
            step="0.01"
            invalid={Boolean(errors.box_length_in)}
            value={value.box_length_in ?? ""}
            onChange={(event) =>
              onChange({ box_length_in: toNumber(event.target.value) })
            }
          />
        </Field>
        <Field
          label="Box width (in)"
          htmlFor={`${idPrefix}-w`}
          required
          error={errors.box_width_in || undefined}
        >
          <Input
            id={`${idPrefix}-w`}
            type="number"
            step="0.01"
            invalid={Boolean(errors.box_width_in)}
            value={value.box_width_in ?? ""}
            onChange={(event) =>
              onChange({ box_width_in: toNumber(event.target.value) })
            }
          />
        </Field>
        <Field
          label="Box height (in)"
          htmlFor={`${idPrefix}-h`}
          required
          error={errors.box_height_in || undefined}
        >
          <Input
            id={`${idPrefix}-h`}
            type="number"
            step="0.01"
            invalid={Boolean(errors.box_height_in)}
            value={value.box_height_in ?? ""}
            onChange={(event) =>
              onChange({ box_height_in: toNumber(event.target.value) })
            }
          />
        </Field>
      </FieldRow>

      <Field
        label={subject === "part" ? "Part weight (kg)" : "Product weight (kg)"}
        required
        error={errors.product_weight_kg || undefined}
        hint={
          subject === "part"
            ? "The bare part with no packaging."
            : "The bare item with no packaging."
        }
      >
        <Input
          type="number"
          step="0.001"
          invalid={Boolean(errors.product_weight_kg)}
          value={value.product_weight_kg ?? ""}
          onChange={(event) =>
            onChange({ product_weight_kg: toNumber(event.target.value) })
          }
        />
      </Field>

      <Field
        label="Packing material weight (kg)"
        required
        error={errors.packing_material_weight_kg || undefined}
        hint="Padding and filler inside the box, not the box itself."
      >
        <Input
          type="number"
          step="0.001"
          invalid={Boolean(errors.packing_material_weight_kg)}
          value={value.packing_material_weight_kg ?? ""}
          onChange={(event) =>
            onChange({ packing_material_weight_kg: toNumber(event.target.value) })
          }
        />
      </Field>

      <Field
        label="Box weight (kg)"
        required
        error={errors.box_weight_kg || undefined}
        hint="The empty carton on its own."
      >
        <Input
          type="number"
          step="0.001"
          invalid={Boolean(errors.box_weight_kg)}
          value={value.box_weight_kg ?? ""}
          onChange={(event) =>
            onChange({ box_weight_kg: toNumber(event.target.value) })
          }
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DerivedField label="Net weight" value={format.weight(net)} unit="kg" />
        <DerivedField label="Gross weight" value={format.weight(gross)} unit="kg" />
        <DerivedField label="Volume" value={format.cbm(volume)} unit="CBM" />
      </div>
    </div>
  );
}

export function toNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}
