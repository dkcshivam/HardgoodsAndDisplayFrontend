"use client";

import { useSyncExternalStore } from "react";

/**
 * What an order sheet asked for that the app does not have yet.
 *
 * It outlives the page, because closing the gap means walking off to the
 * stores screen and the products screen and coming back. Held in
 * localStorage rather than React state for that reason, and read back as
 * *demand* — what is still outstanding is worked out against the live lists,
 * so a row disappears the moment somebody saves the thing it asked for.
 */
export interface ImportGap {
  order_name: string;
  sheet: string;
  stores: string[];
  products: { style_no: string; style_name: string }[];
  saved_at: string;
}

const KEY = "dkc.import-gap";

const listeners = new Set<() => void>();
let cached: { raw: string | null; value: ImportGap | null } = { raw: null, value: null };

function parse(raw: string | null): ImportGap | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ImportGap;
    return Array.isArray(value.stores) && Array.isArray(value.products) ? value : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab writing the same key.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Cached against the raw string: a fresh object every read would spin React. */
function snapshot(): ImportGap | null {
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cached.raw) cached = { raw, value: parse(raw) };
  return cached.value;
}

const serverSnapshot = (): ImportGap | null => null;

function announce() {
  for (const listener of listeners) listener();
}

export function saveGap(gap: ImportGap) {
  window.localStorage.setItem(KEY, JSON.stringify(gap));
  announce();
}

export function clearGap() {
  window.localStorage.removeItem(KEY);
  announce();
}

export const useImportGap = (): ImportGap | null =>
  useSyncExternalStore(subscribe, snapshot, serverSnapshot);
