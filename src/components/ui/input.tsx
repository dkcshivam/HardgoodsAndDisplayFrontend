import { cn } from "@/lib/utils";

export function Input({
  className,
  invalid,
  ...props
}: React.ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-primary-subtle",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
        invalid && "border-destructive-border bg-destructive-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground transition-colors",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-primary-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  ...props
}: React.ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-primary-subtle",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
        invalid && "border-destructive-border bg-destructive-subtle",
        className,
      )}
      {...props}
    />
  );
}
