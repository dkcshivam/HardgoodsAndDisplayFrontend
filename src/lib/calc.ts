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

/**
 * A Display carton holds several different products from one pack template.
 * Each contributes its unit weight times its quantity; packing material is
 * per carton. Mirrors `mixed_carton_net_weight` in calc.py.
 */
export function mixedCartonNetWeight(
  items: { productWeightKg: number | null; quantity: number }[],
  packingMaterialWeightKg: number | null,
): number {
  const contents = items.reduce(
    (sum, item) => sum + (item.productWeightKg ?? 0) * item.quantity,
    0,
  );
  return contents + (packingMaterialWeightKg ?? 0);
}

export function mixedCartonGrossWeight(
  items: { productWeightKg: number | null; quantity: number }[],
  packingMaterialWeightKg: number | null,
  boxWeightKg: number | null,
): number {
  return (
    mixedCartonNetWeight(items, packingMaterialWeightKg) + (boxWeightKg ?? 0)
  );
}

/**
 * How many times a template fits what is left: the smallest whole number of
 * boxes any one of its products allows. Mirrors `max_applications`.
 *
 * The server decides; this only lets the dialog answer while someone types.
 */
export function maxApplications(
  items: { product: number; quantity: number }[],
  remaining: Map<number, number>,
): number {
  if (items.length === 0) return 0;
  return Math.min(
    ...items.map((item) =>
      Math.floor((remaining.get(item.product) ?? 0) / item.quantity),
    ),
  );
}

/**
 * Per-box counts that divide `total` exactly, nearest to `near` first.
 *
 * The whole difficulty of this module is the tail: 110 garlands six to a box
 * strands two, ten to a box strands none. Suggesting the divisors turns that
 * from something you notice four steps later into something you see now.
 */
export function evenSplits(total: number, near: number, take = 3): number[] {
  if (total <= 1) return [];

  const divisors = new Set<number>();
  for (let d = 1; d * d <= total; d++) {
    if (total % d !== 0) continue;
    if (d > 1) divisors.add(d);
    const pair = total / d;
    if (pair > 1 && pair < total) divisors.add(pair);
  }

  return [...divisors]
    .sort((a, b) => Math.abs(a - near) - Math.abs(b - near) || a - b)
    .slice(0, take)
    .sort((a, b) => a - b);
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
