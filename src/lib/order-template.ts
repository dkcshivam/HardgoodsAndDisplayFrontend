"use client";

import writeXlsxFile from "write-excel-file/browser";
import type { Store } from "@/types";

/**
 * The blank order sheet: style numbers down, one column per store across.
 *
 * Built when it is asked for rather than shipped as a file, because the store
 * columns are the point of it. A fixed file would list whatever stores existed
 * the day it was written, and every column that had since been added or
 * renamed would come back from the importer as a store that does not exist.
 */

/** Rows left blank for typing into. Excel adds more if they run out. */
const BLANK_ROWS = 200;

const HEADINGS = ["S NO", "Style Name", "Style No"];

type Cell = {
  value?: string | number;
  type?: typeof String | typeof Number;
  fontWeight?: "bold";
  align?: "left" | "center" | "right";
  wrap?: boolean;
};

export async function downloadOrderTemplate(stores: Store[]): Promise<void> {
  const names = stores.map((store) => store.name);

  const header: Cell[] = [
    ...HEADINGS.map((value) => ({ value, fontWeight: "bold" as const, align: "left" as const })),
    ...names.map((value) => ({
      value,
      fontWeight: "bold" as const,
      align: "center" as const,
      wrap: true,
    })),
    { value: "QTY TOTAL", fontWeight: "bold" as const, align: "center" as const },
  ];

  // Typed but empty, so Excel treats a quantity as a number the moment it is
  // typed rather than as text that sorts oddly later.
  const blank: Cell[] = [
    { type: Number, align: "left" },
    { type: String, align: "left" },
    { type: String, align: "left" },
    ...names.map(() => ({ type: Number, align: "center" as const })),
    { type: Number, align: "center" as const },
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
      ...names.map(() => ({ width: 12 })),
      { width: 12 },
    ],
  }).toFile("dkc-display-order-template.xlsx");
}
