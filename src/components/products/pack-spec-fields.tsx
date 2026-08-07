"use client";

import { Input, Select } from "@/components/ui/input";
import { Field, FieldRow, DerivedField } from "@/components/ui/field";
import { cbm, grossWeight, netWeight, format } from "@/lib/calc";
import type { BoxType } from "@/types";

export interface PackSpecDraft {
  box_type: number | null;
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
  product_weight_kg: number | null;
  box_weight_kg: number | null;
  packing_material_weight_kg: number | null;
}

export const BLANK_PACK_SPEC: PackSpecDraft = {
  box_type: null,
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
 */
export function PackSpecFields({
  value,
  onChange,
  boxTypes,
  idPrefix,
}: {
  value: PackSpecDraft;
  onChange: (patch: Partial<PackSpecDraft>) => void;
  boxTypes: BoxType[];
  idPrefix: string;
}) {
  // Selecting a type fills the dimensions; they stay editable afterwards.
  const chooseBoxType = (id: string) => {
    const selected = boxTypes.find((type) => String(type.id) === id);
    onChange(
      selected
        ? {
            box_type: selected.id,
            box_length_in: selected.length_in,
            box_width_in: selected.width_in,
            box_height_in: selected.height_in,
          }
        : { box_type: null },
    );
  };

  const net = netWeight(value.product_weight_kg, value.packing_material_weight_kg);
  const gross = grossWeight(
    value.product_weight_kg,
    value.packing_material_weight_kg,
    value.box_weight_kg,
  );
  const volume = cbm(value.box_length_in, value.box_width_in, value.box_height_in);

  return (
    <div className="space-y-4">
      <Field label="Box type" htmlFor={`${idPrefix}-box-type`}>
        <Select
          id={`${idPrefix}-box-type`}
          value={value.box_type ?? ""}
          onChange={(event) => chooseBoxType(event.target.value)}
        >
          <option value="">No box type — enter dimensions below</option>
          {boxTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.code} · {type.name} ({format.dimensions(
                type.length_in,
                type.width_in,
                type.height_in,
              )} in)
            </option>
          ))}
        </Select>
      </Field>

      <FieldRow>
        <Field label="Box length (in)">
          <Input
            type="number"
            step="0.01"
            value={value.box_length_in ?? ""}
            onChange={(event) =>
              onChange({ box_length_in: toNumber(event.target.value) })
            }
          />
        </Field>
        <Field label="Box width (in)">
          <Input
            type="number"
            step="0.01"
            value={value.box_width_in ?? ""}
            onChange={(event) =>
              onChange({ box_width_in: toNumber(event.target.value) })
            }
          />
        </Field>
        <Field label="Box height (in)">
          <Input
            type="number"
            step="0.01"
            value={value.box_height_in ?? ""}
            onChange={(event) =>
              onChange({ box_height_in: toNumber(event.target.value) })
            }
          />
        </Field>
      </FieldRow>

      <Field label="Product weight (kg)" hint="The bare item with no packaging.">
        <Input
          type="number"
          step="0.001"
          value={value.product_weight_kg ?? ""}
          onChange={(event) =>
            onChange({ product_weight_kg: toNumber(event.target.value) })
          }
        />
      </Field>

      <Field
        label="Packing material weight (kg)"
        hint="Padding and filler inside the box, not the box itself."
      >
        <Input
          type="number"
          step="0.001"
          value={value.packing_material_weight_kg ?? ""}
          onChange={(event) =>
            onChange({ packing_material_weight_kg: toNumber(event.target.value) })
          }
        />
      </Field>

      <Field label="Box weight (kg)" hint="The empty carton on its own.">
        <Input
          type="number"
          step="0.001"
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
