/**
 * Mirrors DRF output exactly — snake_case, no mapping layer.
 * See ARCHITECTURE.md §5 for what each field means.
 */

export interface Category {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Merchant {
  id: number;
  code: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  is_active: boolean;
}

export type ProductStatus = "active" | "inactive";

/** Repeats identically on a single-box product and on every part. */
export interface PackSpec {
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;

  product_weight_kg: number | null;
  box_weight_kg: number | null;
  packing_material_weight_kg: number | null;

  net_weight_kg: number;
  gross_weight_kg: number;
  cbm: number;
}

/** Exactly one of `product` and `part` is set. */
export interface ProductImage {
  id: number;
  product: number | null;
  part: number | null;
  image: string;
  is_main: boolean;
  sort_order: number;
}

export interface ProductPart extends PackSpec {
  id: number;
  name: string;
  description: string;
  customs_description: string;
  hsn_code: string;

  length_in: number | null;
  width_in: number | null;
  height_in: number | null;

  sort_order: number;
  images: ProductImage[];
}

/** The lighter shape the products table receives. */
export interface ProductListItem {
  id: number;
  style_no: string;
  description: string;
  category: number | null;
  category_name: string;
  is_multi_part: boolean;
  part_count: number;
  pack_per_box: number;
  is_fragile: boolean;
  status: ProductStatus;
}

/**
 * `is_multi_part` decides which half is meaningful: false means the product
 * carries its own PackSpec and `parts` is empty; true means the PackSpec
 * fields are null and every part carries its own.
 */
export interface Product extends Partial<PackSpec> {
  id: number;
  style_no: string;
  description: string;
  category: number | null;
  category_name: string;

  customs_description: string;
  hsn_code: string;

  is_multi_part: boolean;
  is_fragile: boolean;
  status: ProductStatus;

  // Reference only — the item never ships assembled.
  assembled_length_in: number | null;
  assembled_width_in: number | null;
  assembled_height_in: number | null;
  assembled_weight_kg: number | null;

  pack_per_box: number;

  parts: ProductPart[];
  images: ProductImage[];

  total_shipping_weight_kg: number;
  total_shipping_cbm: number;

  created_at: string;
  updated_at: string;
}

export type OrderStatus = "draft" | "packing" | "packed" | "shipped";

export interface ShippingAddress {
  country: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
}

export interface OrderLine {
  id: number;
  product: number;
  product_style_no: string;
  product_description: string;
  quantity: number;
}

export interface Carton {
  id: number;
  carton_no: string;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  net_weight_kg: number;
  gross_weight_kg: number | null;
  cbm: number;
  contents: CartonContent[];
  sort_order: number;
}

/** `part` is set when this row is one part of a multi-part product. */
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

export interface Reconciliation {
  product: number;
  style_no: string;
  ordered: number;
  packed: number;
  is_matched: boolean;
}

export type BlockerCode =
  | "missing_carton_no"
  | "duplicate_carton_no"
  | "missing_dimensions"
  | "gross_below_net"
  | "quantity_mismatch";

/** A reason the packing plan cannot be saved. */
export interface Blocker {
  code: BlockerCode;
  message: string;
  carton_id: number | null;
}

export interface Order {
  id: number;
  number: string;
  name: string;
  merchant: number;
  merchant_name: string;
  buyer_name: string;
  shipping_address: ShippingAddress;
  status: OrderStatus;
  lines: OrderLine[];
  carton_count: number;
  created_at: string;
}

export interface PackingPlan {
  order: number;
  cartons: Carton[];
  reconciliation: Reconciliation[];
  blockers: Blocker[];
  carton_count: number;
  total_quantity: number;
  total_gross_weight_kg: number;
  total_cbm: number;
  can_save: boolean;
}
