/**
 * The shapes Django sends us.
 *
 * Field names are snake_case because that is what Django REST Framework
 * produces by default — keeping them identical on both sides means there
 * is no translation layer to get wrong.
 *
 * Numbers that represent money-like precision (weights, dimensions) arrive
 * from Django's DecimalField as strings by default. We configure DRF to
 * send them as numbers instead; see backend settings.
 */

// ─────────────────────────────────────────────────────────────
// Master data — set up once in Admin, referenced everywhere
// ─────────────────────────────────────────────────────────────

/** A reusable carton specification, e.g. "STD-M, 40 x 30 x 24, max 30kg". */
export interface BoxType {
  id: number;
  code: string; // "STD-M"
  name: string; // "Standard Medium"
  length_in: number;
  width_in: number;
  height_in: number;
  max_weight_kg: number | null;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string; // "Table", "Woodware"
  is_active: boolean;
}

/** A named set of products sharing a packing instruction. */
export interface ProductGroup {
  id: number;
  name: string; // "Oak Dining Collection"
  remark: string; // "Ship with felt pads; keep as a set where possible."
  product_count: number;
}

/** The customer we ship to. */
export interface Merchant {
  id: number;
  code: string; // "UO"
  name: string; // "Urban Outfitters Inc"
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
}

// ─────────────────────────────────────────────────────────────
// Catalogue — the packing recipes
// ─────────────────────────────────────────────────────────────

export type ProductStatus = "active" | "inactive";

/**
 * The box + weight block. It repeats identically on a single-box product
 * and on every part of a multi-part product.
 */
export interface PackSpec {
  box_type: number | null; // BoxType id
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;

  product_weight_kg: number | null; // the bare item
  box_weight_kg: number | null; // the empty carton
  packing_material_weight_kg: number | null; // padding and filler

  // Calculated by the backend from the three above — never edited directly.
  net_weight_kg: number;
  gross_weight_kg: number;
  cbm: number;
}

export interface ProductImage {
  id: number;
  image: string; // URL
  is_main: boolean;
  sort_order: number;
}

/** One separately-boxed component of a multi-part product. */
export interface ProductPart extends PackSpec {
  id: number;
  name: string; // "Table top"
  description: string;
  customs_description: string;
  hsn_code: string;

  length_in: number | null; // the part itself, not its box
  width_in: number | null;
  height_in: number | null;

  sort_order: number;
  images: ProductImage[];
}

/**
 * A packing recipe for one SKU.
 *
 * `is_multi_part` decides which half of this interface is meaningful:
 *   false -> the product carries its own PackSpec, parts is empty
 *   true  -> the PackSpec fields are null, every part carries its own
 */
export interface Product extends Partial<PackSpec> {
  id: number;
  style_no: string; // "DKC-TBL-OAK-01" — unique
  description: string; // internal / trade name
  category: number | null;
  category_name: string; // read-only convenience from the API
  product_group: number | null;
  product_group_name: string | null;

  customs_description: string;
  hsn_code: string;

  is_multi_part: boolean;
  is_fragile: boolean;
  status: ProductStatus;

  // Assembled size and weight of the finished item. For a multi-part
  // product this is reference information only — it is never shipped
  // assembled, so it takes no part in any packing calculation.
  assembled_length_in: number | null;
  assembled_width_in: number | null;
  assembled_height_in: number | null;
  assembled_weight_kg: number | null;

  // Single-box products only: how many units fit in one carton.
  pack_per_box: number;

  parts: ProductPart[];
  images: ProductImage[];

  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Orders and packing
// ─────────────────────────────────────────────────────────────

export type OrderStatus = "draft" | "packing" | "packed" | "shipped";

export interface ShippingAddress {
  country: string; // "US" | "UK" | ...
  line1: string;
  line2: string;
  city: string;
  state: string; // US
  postal_code: string;
}

/** What the merchant asked for. Says nothing about boxes. */
export interface OrderLine {
  id: number;
  product: number;
  product_style_no: string;
  product_description: string;
  quantity: number;
}

/** One physical box, belonging to one order. */
export interface Carton {
  id: number;
  carton_no: string; // "CTN-001" — unique within the order
  box_type: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  gross_weight_kg: number | null;
  cbm: number;
  contents: CartonContent[];
  sort_order: number;
}

/**
 * What is inside a carton. Separate from Carton because a Display carton
 * can hold several different products; a Hardgoods carton holds one.
 * `part` is set when this row is one part of a multi-part product.
 */
export interface CartonContent {
  id: number;
  product: number;
  product_style_no: string;
  part: number | null;
  part_name: string | null;
  description: string;
  quantity: number;
  unit: "pcs" | "set";
  net_weight_kg: number | null;
}

/** Ordered vs actually packed, per product. Drives the green/red chips. */
export interface Reconciliation {
  product: number;
  style_no: string;
  ordered: number;
  packed: number;
  is_matched: boolean;
}

/** A reason the packing plan cannot be saved. */
export interface Blocker {
  code:
    | "missing_carton_no"
    | "duplicate_carton_no"
    | "missing_box_type"
    | "gross_below_net"
    | "quantity_mismatch";
  message: string;
  carton_id: number | null;
}

export interface Order {
  id: number;
  number: string; // "HG-2026-0142"
  name: string; // "UO Fall Dining Refresh"
  merchant: number;
  merchant_name: string;
  buyer_name: string;
  shipping_address: ShippingAddress;
  status: OrderStatus;
  lines: OrderLine[];
  carton_count: number;
  created_at: string;
}

/** The packing workspace payload for one order. */
export interface PackingPlan {
  order: number;
  cartons: Carton[];
  reconciliation: Reconciliation[];
  blockers: Blocker[];
  total_quantity: number;
  total_gross_weight_kg: number;
  total_cbm: number;
  can_save: boolean;
}
