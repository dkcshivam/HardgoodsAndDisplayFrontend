"use client";

import writeXlsxFile from "write-excel-file/browser";

/**
 * The blank order sheet: a style per row, a store per column.
 *
 * The store columns are left empty on purpose. Type the store numbers you are
 * ordering for across the top and upload it — the app checks them against the
 * store list and tells you which ones it does not have yet, which is a better
 * answer than a template that guessed.
 */

/** Rows left blank for typing into. Excel adds more if they run out. */
const BLANK_ROWS = 200;

/** Columns ruled off for stores. Nothing stops more being added past them. */
const STORE_COLUMNS = 60;

const HEADINGS = ["S NO", "Style Name", "Style No"];

type Cell = {
  value?: string;
  type?: typeof String | typeof Number;
  fontWeight?: "bold";
  align?: "center";
  alignVertical?: "center";
  height?: number;
};

export async function downloadOrderTemplate(): Promise<void> {
  const heading = (value?: string): Cell => ({
    value,
    fontWeight: "bold",
    align: "center",
    alignVertical: "center",
    height: 28,
  });

  const header: Cell[] = [
    ...HEADINGS.map((value) => heading(value)),
    // Empty, but styled and sized, so the row reads as somewhere to type.
    ...Array.from({ length: STORE_COLUMNS }, () => heading()),
  ];

  // Typed but empty, so a quantity is a number the moment it is typed rather
  // than text that sorts oddly later.
  const blank: Cell[] = [
    { type: Number, align: "center" },
    { type: String },
    { type: String },
    ...Array.from({ length: STORE_COLUMNS }, (): Cell => ({
      type: Number,
      align: "center",
    })),
  ];

  const data = [header, ...Array.from({ length: BLANK_ROWS }, () => blank)];

  await writeXlsxFile(data, {
    sheet: "Order",
    // The style block stays put while the stores scroll past it.
    stickyRowsCount: 1,
    stickyColumnsCount: 3,
    columns: [
      { width: 8 },
      { width: 34 },
      { width: 20 },
      ...Array.from({ length: STORE_COLUMNS }, () => ({ width: 12 })),
    ],
  }).toFile("dkc-display-order-template.xlsx");
}
