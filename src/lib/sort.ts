"use client";

import { useMemo, useState } from "react";

export type Direction = "asc" | "desc";

export interface SortState {
  /** Null means the order the API sent, which is the third click. */
  key: string | null;
  direction: Direction;
}

/** What a column sorts on. Null and blank sort last whichever way it points. */
export type Accessor<T> = (row: T) => string | number | null | undefined;

/**
 * Numeric-aware and case-insensitive, so "801" lands before "1801" rather
 * than after it, and a lower-case style number sorts beside its neighbours.
 */
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compare(a: unknown, b: unknown): number {
  const aMissing = a === null || a === undefined || a === "";
  const bMissing = b === null || b === undefined || b === "";
  // Blanks are not "small", they are unknown — they belong at the bottom
  // either way, so flipping the direction never surfaces a column of dashes.
  if (aMissing || bMissing) return aMissing && bMissing ? 0 : aMissing ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Sorts rows the table already holds.
 *
 * The API orders by only two or three fields per endpoint, and a header that
 * silently did nothing would be worse than none at all — so every column is
 * sorted here instead, over the whole list the page has loaded.
 */
export function useSort<T>(rows: T[], columns: Record<string, Accessor<T>>) {
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });

  /** A–Z, then Z–A, then back to however the API had it. */
  function toggle(key: string) {
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: "asc" };
    });
  }

  const sorted = useMemo(() => {
    const read = sort.key === null ? null : columns[sort.key];
    if (!read) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    // Sorting a copy: the array belongs to React Query's cache.
    return [...rows].sort((a, b) => compare(read(a), read(b)) * factor);
    // `columns` is rebuilt every render by its caller, so it is deliberately
    // not a dependency — the key identifies the column, not the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  return { sort, toggle, sorted };
}
