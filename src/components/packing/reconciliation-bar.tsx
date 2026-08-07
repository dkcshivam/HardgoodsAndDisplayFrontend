import { Check, X } from "lucide-react";
import type { Reconciliation } from "@/types";

/** Ordered vs packed, per product. The chip a packer scans for red. */
export function ReconciliationBar({ rows }: { rows: Reconciliation[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <span
          key={row.product}
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs " +
            (row.is_matched
              ? "border-success/25 bg-success-subtle text-success"
              : "border-destructive-border bg-destructive-subtle text-destructive")
          }
        >
          {row.is_matched ? (
            <Check className="size-3.5" />
          ) : (
            <X className="size-3.5" />
          )}
          <span className="tabular font-medium">{row.style_no}</span>
          <span className="tabular">
            {row.packed}/{row.ordered}
          </span>
        </span>
      ))}
    </div>
  );
}
