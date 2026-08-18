/**
 * What a form refuses to save without.
 *
 * The API still accepts these blank — a half-filled product is a legitimate
 * row for an importer or the admin to create. This is the packing desk's own
 * rule: a carton cannot be built, weighed or cleared through customs from a
 * product that never answered these, so the form asks while somebody is
 * looking at the item rather than a week later when the order is on the floor.
 */

/** Blank, whitespace, null and undefined all count as unanswered. */
export function missing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/** A number field left empty, or filled in as zero where zero is no answer. */
export function missingNumber(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

export const REQUIRED = "Required";

/** Customs will not clear a carton without both of these. */
export function customsErrors(source: {
  customs_description: string;
  hsn_code: string;
}): Record<string, string> {
  const found: Record<string, string> = {};
  if (missing(source.customs_description)) found.customs_description = REQUIRED;
  if (missing(source.hsn_code)) found.hsn_code = REQUIRED;
  return found;
}

/** The box and the three weights every carton figure is derived from. */
export function packSpecErrors(source: {
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
  product_weight_kg: number | null;
  packing_material_weight_kg: number | null;
  box_weight_kg: number | null;
}): Record<string, string> {
  const found: Record<string, string> = {};
  for (const key of [
    "box_length_in",
    "box_width_in",
    "box_height_in",
    "product_weight_kg",
    "packing_material_weight_kg",
    "box_weight_kg",
  ] as const) {
    if (missingNumber(source[key])) found[key] = REQUIRED;
  }
  return found;
}

/** Saved photos and ones still queued for upload both count. */
export function hasPhoto(source: {
  images: unknown[];
  pending_images: unknown[];
}): boolean {
  return source.images.length + source.pending_images.length > 0;
}
