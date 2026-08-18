/**
 * Reads a buyer's order sheet — style numbers down, stores across.
 *
 * Nothing here decides anything. It turns a spreadsheet into style numbers,
 * store headings and quantities; whether those exist is settled against the
 * catalogue, and the order itself is still written by the API.
 */

import readXlsxFile from "read-excel-file/browser";

/** One style's demand, keyed by the store heading exactly as the sheet writes it. */
export interface SheetLine {
  /** The Excel row, so a problem can be pointed at rather than described. */
  row: number;
  style_no: string;
  style_name: string;
  quantities: Record<string, number>;
}

export interface SheetRead {
  sheet: string;
  header_row: number;
  /** Every column heading between the style block and QTY TOTAL. */
  stores: string[];
  lines: SheetLine[];
  /** Headings that appeared twice; the second one is ignored. */
  duplicate_stores: string[];
}

type Cell = unknown;

/** One tab, read whole. The file is opened once and every tab comes back. */
export interface WorkbookSheet {
  name: string;
  rows: Cell[][];
}

const clean = (value: Cell): string =>
  value === null || value === undefined ? "" : String(value).trim().replace(/\s+/g, " ");

const upper = (value: Cell): string => clean(value).toUpperCase();

// Their sheets spell it "STYE NAME", in every tab and every year. Match both
// rather than making somebody fix a typo they have typed a thousand times.
const STYLE_NO = /^STYLE\s*NO\b/;
const STYLE_NAME = /^ST(?:Y|YL)E\s*NAME\b/;
const QTY_TOTAL = /^QTY\s*TOTAL\b/;

/** Headings in the store range that are plainly not stores. */
const NOT_A_STORE = /^(S\s*NO|PHOTO|SIZE|VENDOR\s*NAME|L|W|H|CBM|REMARKS?|TOTAL)$/;

export class SheetError extends Error {}

export async function readWorkbook(file: File): Promise<WorkbookSheet[]> {
  const sheets = await readXlsxFile(file);
  return sheets.map((sheet) => ({
    name: sheet.sheet,
    rows: sheet.data as Cell[][],
  }));
}

/**
 * The header row is wherever "STYLE NO" is written — row 1 on some tabs and
 * row 2 on those that carry a group band above it, so it is found rather than
 * assumed.
 */
function findHeader(rows: Cell[][]): number {
  const limit = Math.min(rows.length, 12);
  for (let index = 0; index < limit; index += 1) {
    if (rows[index]?.some((cell) => STYLE_NO.test(upper(cell)))) return index;
  }
  throw new SheetError(
    "No column headed “Style No” in the first few rows. Is this the right sheet?",
  );
}

export function parseSheet({ name, rows }: WorkbookSheet): SheetRead {
  if (rows.length === 0) throw new SheetError("That sheet is empty.");

  const headerRow = findHeader(rows);
  const header = rows[headerRow];

  const styleNoAt = header.findIndex((cell) => STYLE_NO.test(upper(cell)));
  const styleNameAt = header.findIndex((cell) => STYLE_NAME.test(upper(cell)));
  if (styleNameAt < 0) {
    throw new SheetError("No column headed “Style Name” next to the style numbers.");
  }

  // Everything the stores are not: the style block on the left, and the totals
  // and box figures on the right.
  const blockEnd = Math.max(
    styleNoAt,
    styleNameAt,
    header.findIndex((cell) => /^SIZE$/.test(upper(cell))),
    header.findIndex((cell) => /^PHOTO$/.test(upper(cell))),
  );
  const totalAt = header.findIndex(
    (cell, index) => index > blockEnd && QTY_TOTAL.test(upper(cell)),
  );
  const storeEnd = totalAt < 0 ? header.length : totalAt;

  const stores: string[] = [];
  const duplicates: string[] = [];
  const columnOf = new Map<string, number>();

  for (let index = blockEnd + 1; index < storeEnd; index += 1) {
    const heading = clean(header[index]);
    // A blank column separates the style block from the stores on some tabs.
    if (!heading || NOT_A_STORE.test(heading.toUpperCase())) continue;
    if (columnOf.has(heading)) {
      duplicates.push(heading);
      continue;
    }
    columnOf.set(heading, index);
    stores.push(heading);
  }

  if (stores.length === 0) {
    throw new SheetError("No store columns between the style numbers and QTY TOTAL.");
  }

  const lines: SheetLine[] = [];
  for (let index = headerRow + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const style_no = clean(row?.[styleNoAt] ?? null);
    if (!style_no) continue;

    const quantities: Record<string, number> = {};
    for (const [heading, at] of columnOf) {
      const value = Number(row?.[at] ?? 0);
      quantities[heading] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    }

    lines.push({
      row: index + 1,
      style_no,
      style_name: clean(row?.[styleNameAt] ?? null),
      quantities,
    });
  }

  if (lines.length === 0) throw new SheetError("No style numbers under that header row.");

  return {
    sheet: name,
    header_row: headerRow + 1,
    stores,
    lines,
    duplicate_stores: duplicates,
  };
}

/* ── Matching the sheet against what the app already has ──────────────── */

/** Names and style numbers are compared loosely; people type them by hand. */
export const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export interface MissingProduct {
  style_no: string;
  style_name: string;
  /** Set when the style number is known but under a different name. */
  known_as: string | null;
}

export interface SheetMatch {
  missing_stores: string[];
  missing_products: MissingProduct[];
  /** Style rows nobody ordered — carried so the count in the UI adds up. */
  unordered: number;
  total_quantity: number;
}

interface Named {
  id: number;
  name: string;
}

interface Styled {
  id: number;
  style_no: string;
  style_name: string;
}

/**
 * A product must match on style number *and* name, as asked. The two failures
 * are kept apart: a style number nobody has is a product to create, while one
 * that exists under another name is a clash — creating it would be refused,
 * since a style number is unique.
 */
export function matchSheet(
  read: SheetRead,
  chosenStores: string[],
  products: Styled[],
  stores: Named[],
): SheetMatch {
  const byStyle = new Map(products.map((item) => [key(item.style_no), item]));
  const known = new Set(stores.map((item) => key(item.name)));

  const missing_stores = chosenStores.filter((name) => !known.has(key(name)));

  const missing_products: MissingProduct[] = [];
  let unordered = 0;
  let total_quantity = 0;

  for (const line of read.lines) {
    const wanted = chosenStores.reduce(
      (sum, name) => sum + (line.quantities[name] ?? 0),
      0,
    );
    total_quantity += wanted;
    if (wanted === 0) {
      unordered += 1;
      continue;
    }

    const match = byStyle.get(key(line.style_no));
    if (!match) {
      missing_products.push({
        style_no: line.style_no,
        style_name: line.style_name,
        known_as: null,
      });
    } else if (key(match.style_name) !== key(line.style_name)) {
      missing_products.push({
        style_no: line.style_no,
        style_name: line.style_name,
        known_as: match.style_name || "(no name)",
      });
    }
  }

  return { missing_stores, missing_products, unordered, total_quantity };
}
