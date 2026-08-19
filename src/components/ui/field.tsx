import { cn } from "@/lib/utils";

/**
 * One labelled row of the form. Strict vertical flow — every weight field
 * gets its own row; only dimension groups share one (ARCHITECTURE.md §8).
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-secondary-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FieldRow({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3", className)}
      {...props}
    />
  );
}

/** A calculated value shown beside the inputs that produce it. */
export function DerivedField({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="tabular mt-0.5 text-sm font-semibold text-primary">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

/** A single flag, sized to sit in a FieldRow beside the inputs. */
export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex h-9 items-center gap-2.5 self-end rounded-md border border-input bg-card px-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[var(--color-primary)]"
      />
      <span className="text-xs font-medium text-secondary-foreground">
        {label}
      </span>
    </label>
  );
}
