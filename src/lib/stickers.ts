import type {
  Carton,
  DisplayCarton,
  ProductListItem,
  DisplayProduct,
} from "@/types";
import { mainImage } from "@/lib/images";

/** One thing inside the box — a line of the sticker's table. */
export interface StickerRow {
  key: string;
  style_no: string;
  style_name: string;
  /** Set when the box holds one part of a product rather than all of it. */
  part_name: string;
  image: string | null;
  quantity: number;
  unit: string;
}

export interface Sticker {
  box_no: string;
  /** Display ships to a store; a hardgoods order ships to one address. */
  scope_label: "Store" | "Order";
  scope_value: string;
  rows: StickerRow[];
}

/** A box with more rows than fit carries on over as many sheets as it needs. */
export interface StickerPage {
  sticker: Sticker;
  rows: StickerRow[];
  page: number;
  pages: number;
}

export const ROWS_PER_PAGE = 8;

export function paginate(
  stickers: Sticker[],
  perPage = ROWS_PER_PAGE,
): StickerPage[] {
  const size = Math.max(1, Math.floor(perPage));
  return stickers.flatMap((sticker) => {
    // An empty box still gets a sheet — it is on the truck either way, and a
    // box with no sticker reads as a box somebody forgot.
    const pages = Math.max(1, Math.ceil(sticker.rows.length / size));
    return Array.from({ length: pages }, (_, index) => ({
      sticker,
      rows: sticker.rows.slice(index * size, (index + 1) * size),
      page: index + 1,
      pages,
    }));
  });
}

export function displayStickers(
  cartons: DisplayCarton[],
  products: DisplayProduct[],
): Sticker[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return cartons.map((carton) => ({
    box_no: carton.carton_no,
    scope_label: "Store",
    scope_value: carton.store_name,
    rows: carton.contents.map((content) => {
      // The carton stores an id; the name and the photo live on the product.
      const product = byId.get(content.product);
      return {
        key: String(content.id),
        style_no: content.product_style_no,
        style_name:
          product?.style_name || product?.description || content.description,
        part_name: "",
        image: product ? mainImage(product.images) : null,
        quantity: content.quantity,
        unit: content.unit,
      };
    }),
  }));
}

export function hardgoodsStickers(
  cartons: Carton[],
  orderNumber: string,
  products: ProductListItem[],
): Sticker[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return cartons.map((carton) => ({
    box_no: carton.carton_no,
    scope_label: "Order",
    scope_value: orderNumber,
    rows: carton.contents.map((content) => {
      const product = byId.get(content.product);
      return {
        key: String(content.id),
        style_no: content.product_style_no,
        style_name:
          product?.style_name || product?.description || content.description,
        // Parts carry no photo of their own, so the product's stands in.
        part_name: content.part_name ?? "",
        image: product?.main_image ?? null,
        quantity: content.quantity,
        unit: content.unit,
      };
    }),
  }));
}

/**
 * Boxes whose trailing number falls inside the range, both ends inclusive.
 * Typed as digits — "1" and "001" mean the same box — and a blank end means
 * open, so a half-filled range still narrows the print.
 */
export function inRange(
  stickers: Sticker[],
  from: string,
  to: string,
): Sticker[] {
  const low = parseBoxNo(from);
  const high = parseBoxNo(to);
  if (low === null && high === null) return stickers;
  return stickers.filter((sticker) => {
    const number = parseBoxNo(sticker.box_no);
    if (number === null) return true;
    return (low === null || number >= low) && (high === null || number <= high);
  });
}

function parseBoxNo(value: string): number | null {
  const digits = /(\d+)\s*$/.exec(value.trim());
  return digits ? Number(digits[1]) : null;
}
