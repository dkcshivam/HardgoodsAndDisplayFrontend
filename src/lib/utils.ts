import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Style numbers are punctuated ("DSP-ARC-84") and labels carry an em dash, so
 * a plain substring match fails on anything typed with spaces. Flattening
 * every separator to one lets "dsp arc" and "DSP-ARC-84" find the same row.
 */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/** Every term has to match, so extra words narrow rather than widen. */
export function searchTerms(search: string): string[] {
  return normalize(search).split(" ").filter(Boolean)
}

export function matchesTerms(haystack: string, terms: string[]): boolean {
  const flat = normalize(haystack)
  return terms.every((term) => flat.includes(term))
}
