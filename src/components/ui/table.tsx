import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortState } from "@/lib/sort";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b border-border-subtle bg-secondary/50", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A header that sorts. Click cycles A–Z, Z–A, then back to the API's order —
 * the third click matters, because there is otherwise no way back to it
 * without reloading the page.
 */
export function SortTH({
  column,
  sort,
  onSort,
  className,
  children,
}: {
  column: string;
  sort: SortState;
  onSort: (column: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = sort.key === column;
  const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TH className={cn("p-0", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        title={
          !active
            ? "Sort A–Z"
            : sort.direction === "asc"
              ? "Sort Z–A"
              : "Back to the default order"
        }
        className={cn(
          "group inline-flex w-full items-center gap-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          // The cell's own alignment decides which side the icon sits on.
          className?.includes("text-right") && "justify-end",
          className?.includes("text-center") && "justify-center",
        )}
      >
        {children}
        <Icon
          className={cn(
            "size-3 shrink-0 transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
          )}
        />
      </button>
    </TH>
  );
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border-subtle last:border-0 hover:bg-accent/50",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td className={cn("px-4 py-2.5 align-middle", className)} {...props} />
  );
}

export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-muted-foreground"
      >
        {children}
      </td>
    </tr>
  );
}
