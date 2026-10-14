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
 * One outlet. Stores are global rather than owned by a merchant, so any order
 * may ship to any of them — and since a carton is never shared between two
 * stores, this is the boundary a display order is split along.
 */
export interface Store {
  id: number;
  /** Number and name in one, as the buyer writes it: "118 Portland Pearl". */
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
  is_delegate: boolean;
  description: string;
  customs_description: string;
  hsn_code: string;
  hts_code: string;

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
  style_name: string;
  description: string;
  category: number | null;
  category_name: string;
  is_multi_part: boolean;
  is_delegate: boolean;
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
  /** The buyer's name for it — what a box sticker prints. */
  style_name: string;
  description: string;
  category: number | null;
  category_name: string;

  customs_description: string;
  hsn_code: string;
  hts_code: string;

  /** Fixed at creation — the shape every carton for this SKU was built from. */
  is_multi_part: boolean;
  /** Set per piece; a multi-part product flags each part on its own. */
  is_delegate: boolean;
  /** On an order. The database refuses the delete; the form says so first. */
  is_in_use: boolean;
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
  product_style_name: string;
  product_description: string;
  /** Set per order: the same SKU ships in whatever finish was asked for. */
  color: string;
  quantity: number;
  /** Unit price on this order. The invoice multiplies it by what ships. */
  rate_usd: number | null;
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

/** What one style sells for on one display order — never per store. */
export interface DisplayOrderRate {
  id?: number;
  product: number;
  product_style_no?: string;
  rate_usd: number;
}

export interface ExportDetails {
  invoice_number?: string;
  invoice_date?: string;
  po_number?: string;
  lc_number?: string;
  lc_date?: string;
  lc_number_date?: string;
  other_reference?: string;
  other_consignee?: string;
  final_destination_country?: string;
  place_of_receipt?: string;
  vessel_flight_no?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  final_destination?: string;
  shipping_line?: string;
  container_no?: string;
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
  export_details?: ExportDetails;
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
  is_delegate: boolean;
  description: string;
  images: ProductImage[];
  customs_description: string;
  hsn_code: string;
  hts_code: string;

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
  style_name: string;
  description: string;
  category: number | null;
  category_name: string;
  customs_description: string;
  hsn_code: string;
  hts_code: string;

  /** Fixed at creation — every template item for this SKU assumed it. */
  is_multi_part: boolean;
  /** Set per piece; a multi-part product flags each part on its own. */
  is_delegate: boolean;
  status: ProductStatus;

  /** Empty on a multi-part product; its parts carry these instead. */
  product_weight_kg: number | null;

  /** The item itself. Its box belongs to the template. */
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  unit_cbm: number;

  parts: DisplayProductPart[];
  images: ProductImage[];

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
  /**
   * Only on the response to an edit that changed what the box holds: the
   * steps already built from it are replayed, and these are the ones that
   * had to move.
   */
  adjustments?: Adjustment[];
}

/** What one store wants, of one product. Stores need not share a product mix. */
export interface DisplayOrderLine {
  id: number;
  store: number;
  store_name: string;
  product: number;
  product_style_no: string;
  product_style_name: string;
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
  rates: DisplayOrderRate[];
  carton_count: number;
  export_details?: ExportDetails;
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
  /** Where it ships. Held on the carton so a stepless box still knows. */
  store: number;
  store_name: string;
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
  /** Whose it is. Two stores wanting one product are two separate rows. */
  store: number;
  store_name: string;
  product: number;
  /** Set when the product packs as parts — this row counts that part alone. */
  part: number | null;
  style_no: string;
  style_name: string;
  part_name: string;
  description: string;
  quantity: number;
}

/** One application of a template, plus the derivation the screen shows. */
export interface PackStepRow {
  sequence: number;
  store: number;
  store_name: string;
  template: number;
  template_code: string;
  template_name: string;
  count: number;
  carton_count: number;
  consumed: QuantityRow[];
  remaining_after: QuantityRow[];
}

/**
 * Display reconciles store by store — twenty-four wreaths in Portland do
 * nothing for Austin, so one product across two stores is two rows.
 */
export interface DisplayReconciliation extends Reconciliation {
  store: number;
  store_name: string;
  /**
   * The lowest this order line may be set to. Not `packed`: that counts whole
   * products and so takes the smallest part count, while a line is pinned by
   * the *largest* — twenty tops in boxes are stranded by an order for ten,
   * however few legs went with them.
   */
  packed_floor: number;
}

/** A store named only by identity — a copy target, not a progress report. */
export interface StoreRef {
  store: number;
  store_name: string;
}

/** How far one store has got. The overview the packing screen opens on. */
export interface StoreProgress {
  store: number;
  store_name: string;
  ordered: number;
  packed: number;
  remaining: number;
  carton_count: number;
  is_done: boolean;
}

/** One piece a box design takes, and how many of it per box. */
export interface TemplateContent {
  style_no: string;
  part_name: string;
  quantity: number;
}

export interface ApplicableTemplate {
  template: number;
  code: string;
  name: string;
  /** How many times it fits what is left, right now. */
  capacity: number;
  units_per_carton: number;
  contents: TemplateContent[];
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
  /** Which store the detail below is for. Null means the order overview. */
  store: number | null;
  /** Always the whole order, so the overview never needs a second request. */
  stores: StoreProgress[];
  steps: PackStepRow[];
  remaining: QuantityRow[];
  applicable_templates: ApplicableTemplate[];
  reconciliation: DisplayReconciliation[];
  /** Stores this store's plan could be copied onto verbatim. */
  replicable: StoreRef[];
  blockers: Blocker[];
  warnings: PackWarning[];
  carton_count: number;
  total_quantity: number;
  total_gross_weight_kg: number;
  total_cbm: number;
  can_save: boolean;
  /** Only present on the response to a step edit. */
  adjustments?: Adjustment[];
  /** Only present on the response to a replicate. */
  replicated_to?: StoreRef[];
}

/* ── Printable documents ──────────────────────────────────────────────
 *
 * Built server-side by the same code that writes the .xlsx, so the print
 * page and the spreadsheet cannot quote different figures. `places` is the
 * Excel number format's decimal count; null means the column is text.
 */

export interface DocColumn {
  label: string;
  places: number | null;
}

export type DocValue = string | number | null;

export interface DocRow {
  /** First row of a box — takes the heavier rule above it. */
  opens: boolean;
  values: DocValue[];
}

export interface DocBlock {
  /** Display blocks by store; Hardgoods has one unbannered block. */
  banner: string;
  rows: DocRow[];
  subtotal_label: string;
  subtotal: DocValue[] | null;
}

export interface PackingListDocument {
  title: string;
  facts: { label: string; value: string }[];
  columns: DocColumn[];
  blocks: DocBlock[];
  total_label: string;
  total: DocValue[] | null;
}

export interface InvoiceDocument {
  title: string;
  exporter: string[];
  consignee: string[];
  ship_to: string[];
  origin: string;
  /** Ruled and labelled but left empty — the desk fills these. */
  shipment_fields: string[][];
  columns: DocColumn[];
  lines: DocValue[][];
  total: {
    quantity: number;
    net_weight_kg: number;
    amount_usd: number | null;
  };
  is_priced: boolean;
  amount_in_words: string;
  origin_line: string;
  note: string;
  declaration: string[];
  signatory: string;
  for_exporter: string;
}

/* ── Accounts ─────────────────────────────────────────────────────── */

export type Role = "admin" | "senior_merchant" | "merchant";

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  /** Falls back to the username when both names are blank. */
  full_name: string;
  email: string;
  role: Role;
  role_label: string;
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
}

/** What `/users/` accepts. `password` is write-only: required on create, a reset on edit. */
export type UserWrite = Pick<
  User,
  "username" | "first_name" | "last_name" | "email" | "role" | "is_active"
> & { password?: string };

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

/* ── Audit trail ──────────────────────────────────────────────────── */

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "advance_status"
  | "save_packing"
  | "auto_pack"
  | "add_step"
  | "update_step"
  | "delete_step"
  | "replicate"
  | "login"
  | "logout";

/** JSON-safe: decimals and dates arrive as strings. */
export type AuditValue =
  | string
  | number
  | boolean
  | null
  | AuditValue[]
  | { [key: string]: AuditValue };

/** Append-only. Names are snapshots, so a renamed record reads as it was then. */
export interface AuditEvent {
  id: number;
  created_at: string;
  /** Null once the user record is gone; `actor_name` survives it. */
  actor: number | null;
  actor_name: string;
  action: AuditAction;
  action_label: string;
  /** `app_label.model`, e.g. `orders.order`. */
  target_type: string;
  target_label: string;
  target_id: string;
  target_repr: string;
  /**
   * `{field: [before, after]}` — before is null on create, after on delete.
   * A collection (parts, lines, items) is `[rows removed, rows added]` instead.
   */
  changes: Record<string, [AuditValue, AuditValue]>;
}
