/**
 * The domain maths, in one place.
 *
 * UNITS — decided once, never mixed:
 *   dimensions -> inches (in)
 *   weights    -> kilograms (kg)
 *   volume     -> cubic metres (CBM)
 *
 * These same rules also live in Django. The backend is the source of
 * truth and recalculates on save; these copies exist so the form can show
 * the answer live as the user types, without a round trip.
 */

/** One cubic metre is 61,023.744 cubic inches. */
const CUBIC_INCHES_PER_CBM = 61_023.744_094_732_28;

/** Cubic metres from box dimensions in inches. */
export function cbm(
  lengthIn: number | null,
  widthIn: number | null,
  heightIn: number | null,
): number {
  if (!lengthIn || !widthIn || !heightIn) return 0;
  return (lengthIn * widthIn * heightIn) / CUBIC_INCHES_PER_CBM;
}

/**
 * Everything inside the box: the item itself plus its padding.
 * Excludes the carton.
 */
export function netWeight(
  productWeightKg: number | null,
  packingMaterialWeightKg: number | null,
): number {
  return (productWeightKg ?? 0) + (packingMaterialWeightKg ?? 0);
}

/**
 * The whole sealed carton — what a courier would put on the scale.
 * Net plus the empty carton itself.
 */
export function grossWeight(
  productWeightKg: number | null,
  packingMaterialWeightKg: number | null,
  boxWeightKg: number | null,
): number {
  return netWeight(productWeightKg, packingMaterialWeightKg) + (boxWeightKg ?? 0);
}

/** Display helpers — keep every weight and volume formatted the same way. */
export const format = {
  /** 0.9 -> "0.900" — three decimals, the precision customs documents use. */
  weight: (kg: number | null | undefined) => (kg ?? 0).toFixed(3),
  /** 0.0053 -> "0.0053" */
  cbm: (value: number | null | undefined) => (value ?? 0).toFixed(4),
  /** 38 -> "38", 38.5 -> "38.5" — dimensions rarely need trailing zeros. */
  dimension: (inches: number | null | undefined) =>
    inches == null ? "—" : String(Number(inches)),
  /** "38 x 28 x 5" for a size summary line. */
  dimensions: (
    l: number | null | undefined,
    w: number | null | undefined,
    h: number | null | undefined,
  ) =>
    l == null || w == null || h == null
      ? "—"
      : `${Number(l)} × ${Number(w)} × ${Number(h)}`,
};

/**
 * How many cartons a quantity of a single-box product needs.
 * 6 chairs that pack 2-per-box = 3 cartons.
 */
export function cartonCount(quantity: number, packPerBox: number): number {
  if (packPerBox <= 0) return 0;
  return Math.ceil(quantity / packPerBox);
}
