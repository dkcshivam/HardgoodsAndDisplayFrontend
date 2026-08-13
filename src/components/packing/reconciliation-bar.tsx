import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Reconciliation } from "@/types";

/** Ordered vs packed, per product. The row a packer scans for red. */
export function ReconciliationBar({ rows }: { rows: Reconciliation[] }) {
  if (rows.length === 0) return null;

  const short = rows.filter((row) => !row.is_matched).length;

  return (
    <Card className={short > 0 ? "border-destructive-border" : undefined}>
      <Table>
        <THead>
          <tr>
            <TH>Product</TH>
            <TH className="w-28 text-center">Ordered</TH>
            <TH className="w-28 text-center">Packed</TH>
            <TH className="w-32 text-center">Status</TH>
          </tr>
        </THead>
        <tbody>
          {rows.map((row) => (
            <TR key={row.product}>
              <TD className="tabular font-medium">{row.style_no}</TD>
              <TD className="tabular text-center text-secondary-foreground">
                {row.ordered}
              </TD>
              <TD
                className={cn(
                  "tabular text-center font-medium",
                  row.is_matched ? "text-success" : "text-destructive",
                )}
              >
                {row.packed}
              </TD>
              <TD className="text-center">
                {row.is_matched ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <Check className="size-3.5" /> matched
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                    <X className="size-3.5" /> {row.ordered - row.packed} short
                  </span>
                )}
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
