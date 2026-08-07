import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-destructive-subtle text-destructive",
        info: "bg-primary-subtle text-primary",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  draft: "bg-status-draft-bg text-status-draft",
  packing: "bg-status-packing-bg text-status-packing",
  packed: "bg-status-packed-bg text-status-packed",
  shipped: "bg-status-shipped-bg text-status-shipped",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize leading-5",
        STATUS_CLASS[status],
      )}
    >
      {status}
    </span>
  );
}
