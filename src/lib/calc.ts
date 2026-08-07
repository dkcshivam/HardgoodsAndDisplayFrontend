/**
 * Mirrors backend/apps/common/calc.py so forms can show an answer as the
 * user types. The backend recalculates on save and wins.
 *
 * Dimensions in inches, weights in kilograms, volume in CBM.
 */

const CUBIC_INCHES_PER_CBM = 61_023.744_094_732_28;

export function cbm(
  lengthIn: number | null,
  widthIn: number | null,
  heightIn: number | null,
): number {
  if (!lengthIn || !widthIn || !heightIn) return 0;
  return (lengthIn * widthIn * heightIn) / CUBIC_INCHES_PER_CBM;
}

/** Everything inside the box: the item plus its padding, not the carton. */
export function netWeight(
  productWeightKg: number | null,
  packingMaterialWeightKg: number | null,
): number {
  return (productWeightKg ?? 0) + (packingMaterialWeightKg ?? 0);
}

/** The whole sealed carton, as a courier would weigh it. */
export function grossWeight(
  productWeightKg: number | null,
  packingMaterialWeightKg: number | null,
  boxWeightKg: number | null,
): number {
  return netWeight(productWeightKg, packingMaterialWeightKg) + (boxWeightKg ?? 0);
}

export const format = {
  weight: (kg: number | null | undefined) => (kg ?? 0).toFixed(3),
  cbm: (value: number | null | undefined) => (value ?? 0).toFixed(4),
  dimension: (inches: number | null | undefined) =>
    inches == null ? "—" : String(Number(inches)),
  dimensions: (
    l: number | null | undefined,
    w: number | null | undefined,
    h: number | null | undefined,
  ) =>
    l == null || w == null || h == null
      ? "—"
      : `${Number(l)} × ${Number(w)} × ${Number(h)}`,
  integer: (value: number | null | undefined) =>
    (value ?? 0).toLocaleString("en-US"),
  date: (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
};

/** 6 chairs that pack 2-per-box = 3 cartons. */
export function cartonCount(quantity: number, packPerBox: number): number {
  if (packPerBox <= 0) return 0;
  return Math.ceil(quantity / packPerBox);
}
