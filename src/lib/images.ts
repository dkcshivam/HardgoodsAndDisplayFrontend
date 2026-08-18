import type { ProductImage } from "@/types";

/** The photo to stand for a product or a part — the main one, else the first. */
export function mainImage(images?: ProductImage[]): string | null {
  if (!images || images.length === 0) return null;
  return (images.find((image) => image.is_main) ?? images[0]).image;
}
