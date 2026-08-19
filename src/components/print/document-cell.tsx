import { cn } from "@/lib/utils";
import type { DocColumn, DocValue } from "@/types";

/**
 * One cell, formatted the way the workbook formats it. `places` comes from
 * the same Excel number format the .xlsx cell carries, so "0.000" prints
 * three decimals on paper and in the sheet alike — no rounding of our own.
 */
export function Cell({
  value,
  column,
  bold,
  className,
}: {
  value: DocValue;
  column: DocColumn;
  bold?: boolean;
  className?: string;
}) {
  const numeric = column.places !== null && typeof value === "number";

  return (
    <td
      className={cn(
        "border border-black px-1 py-[2px] align-top",
        numeric ? "text-right tabular-nums" : "text-left",
        bold && "font-bold",
        className,
      )}
    >
      {numeric ? value.toFixed(column.places ?? 0) : (value ?? "")}
    </td>
  );
}
