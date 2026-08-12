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

/**
 * One outlet of a merchant. The merchant buys; the store receives — and since
 * a carton is never shared between two stores, this is the boundary a display
 * order is split along.
 */
export interface Store {
  id: number;
  merchant: number;
  merchant_name: string;
  code: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  ship_line1: string;
  ship_line2: string;
  ship_city: string;
  ship_state: string;
  ship_postal_code: string;
  ship_country: string;
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
  main_image: string | null;
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

  /** Fixed at creation — the shape every carton for this SKU was built from. */
  is_multi_part: boolean;
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
  /** Set per order: the same SKU ships in whatever finish was asked for. */
  color: string;
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

/* ── Display ────────────────────────────────────────────────────────
 *
 * A separate module, not a variant of the above. See ARCHITECTURE.md §10:
 * a display product owns no box — the pack template does — and the plan is
 * a list of steps rather than a list of cartons.
 */

/**
 * One separately-packed component. Like its product it owns no box — the
 * point of it is that a product's parts may go into *different* templates.
 */
export interface DisplayProductPart {
  id: number;
  name: string;
  description: string;
  customs_description: string;
  hsn_code: string;

  product_weight_kg: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  unit_cbm: number;

  sort_order: number;
}

export interface DisplayProduct {
  id: number;
  style_no: string;
  description: string;
  category: number | null;
  category_name: string;
  customs_description: string;
  hsn_code: string;

  /** Fixed at creation — every template item for this SKU assumed it. */
  is_multi_part: boolean;
  status: ProductStatus;

  /** Empty on a multi-part product; its parts carry these instead. */
  product_weight_kg: number | null;

  /** The item itself. Its box belongs to the template. */
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  unit_cbm: number;

  parts: DisplayProductPart[];

  created_at: string;
}

export interface PackTemplateItem {
  id: number;
  product: number;
  product_style_no: string;
  product_description: string;
  /** Which part of it goes in this box; null when the product is one piece. */
  part: number | null;
  part_name: string;
  quantity: number;
}

export interface PackTemplate {
  id: number;
  code: string;
  name: string;
  merchant: number | null;
  merchant_name: string | null;
  remark: string;

  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
  box_weight_kg: number | null;
  packing_material_weight_kg: number | null;

  /** A *full* box of this template — no carton reads these. */
  cbm: number;
  net_weight_kg: number;
  gross_weight_kg: number;
  total_units: number;

  /** Off for a one-off authored against a single order's tail. */
  is_library: boolean;
  /** Set on a one-off: it is offered on that order and nowhere else. */
  order: number | null;
  is_active: boolean;

  items: PackTemplateItem[];
  created_at: string;
}

export interface DisplayOrderLine {
  id: number;
  product: number;
  product_style_no: string;
  product_description: string;
  color: string;
  quantity: number;
}

export interface DisplayOrder {
  id: number;
  number: string;
  name: string;
  merchant: number;
  merchant_name: string;
  buyer_name: string;
  shipping_address: ShippingAddress;
  status: OrderStatus;
  lines: DisplayOrderLine[];
  carton_count: number;
  created_at: string;
}

export interface DisplayCartonContent {
  id: number;
  product: number;
  product_style_no: string;
  description: string;
  quantity: number;
  unit: "pcs" | "set";
  net_weight_kg: number | null;
}

export interface DisplayCarton {
  id: number;
  carton_no: string;
  /** Provenance. Null means somebody built this box by hand. */
  step: number | null;
  template_code: string | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  box_weight_kg: number | null;
  packing_material_weight_kg: number | null;
  net_weight_kg: number;
  gross_weight_kg: number | null;
  cbm: number;
  sort_order: number;
  contents: DisplayCartonContent[];
}

/** One product's share of a step's consumption, or of what is left. */
export interface QuantityRow {
  product: number;
  /** Set when the product packs as parts — this row counts that part alone. */
  part: number | null;
  style_no: string;
  part_name: string;
  description: string;
  quantity: number;
}

/** One application of a template, plus the derivation the screen shows. */
export interface PackStepRow {
  sequence: number;
  template: number;
  template_code: string;
  template_name: string;
  count: number;
  carton_count: number;
  consumed: QuantityRow[];
  remaining_after: QuantityRow[];
}

export interface ApplicableTemplate {
  template: number;
  code: string;
  name: string;
  /** How many times it fits what is left, right now. */
  capacity: number;
  units_per_carton: number;
}

export type WarningCode = "template_capacity_exceeded" | "poor_fill";

/** Advisory only — never blocks a save. */
export interface PackWarning {
  code: WarningCode;
  message: string;
  carton_id: number | null;
}

/** A step the replay had to change because an earlier one moved. */
export interface Adjustment {
  sequence: number;
  template_code: string;
  was: number;
  now: number;
}

export interface DisplayPackingPlan {
  order: number;
  steps: PackStepRow[];
  remaining: QuantityRow[];
  applicable_templates: ApplicableTemplate[];
  reconciliation: Reconciliation[];
  blockers: Blocker[];
  warnings: PackWarning[];
  carton_count: number;
  total_quantity: number;
  total_gross_weight_kg: number;
  total_cbm: number;
  can_save: boolean;
  /** Only present on the response to a step edit. */
  adjustments?: Adjustment[];
}
