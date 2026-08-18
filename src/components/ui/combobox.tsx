"use client";

import { useRef, useState } from "react";
import { Popover as Primitive } from "radix-ui";
import { Check, ChevronDown, ImageOff, Search } from "lucide-react";
import { cn, matchesTerms, searchTerms } from "@/lib/utils";

export interface ComboboxOption {
  value: number;
  /** The line that identifies it — a style number, a code. */
  label: string;
  /** The second line, shown under the label and searched alongside it. */
  hint?: string;
  /** Searched but never shown — a description behind a style name. */
  keywords?: string;
  /**
   * A thumbnail. Null keeps the placeholder, so rows stay in line whether or
   * not a product has a photo; leave it off entirely and no column appears.
   */
  image?: string | null;
}

function Thumb({ src, className }: { src?: string | null; className?: string }) {
  return src ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      className={cn(
        "shrink-0 rounded border border-border object-cover",
        className,
      )}
    />
  ) : (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded border border-dashed border-border text-muted-foreground/50",
        className,
      )}
    >
      <ImageOff className="size-3" />
    </div>
  );
}

/**
 * A select you can type into. Plain `<select>` is fine at ten options and
 * useless at two hundred: the list is style numbers, and nobody scrolls a
 * catalogue looking for one.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  searchPlaceholder = "Search…",
  empty = "Nothing matches.",
  disabled,
  invalid,
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  empty?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const terms = searchTerms(search);
  const visible = terms.length
    ? options.filter((option) =>
        matchesTerms(
          `${option.label} ${option.hint ?? ""} ${option.keywords ?? ""}`,
          terms,
        ),
      )
    : options;

  const chosen = options.find((option) => option.value === value);
  // Only make room for pictures when the caller deals in them.
  const showThumbs = options.some((option) => option.image !== undefined);

  function pick(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    setSearch("");
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        event.key === "ArrowDown"
          ? Math.min(active + 1, visible.length - 1)
          : Math.max(active - 1, 0);
      setActive(next);
      // Keep the highlighted row on screen — arrowing past the fold and
      // seeing nothing move is the same as the list being broken.
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (event.key === "Enter" && visible[active]) {
      event.preventDefault();
      pick(visible[active]);
    }
  }

  return (
    <Primitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSearch("");
          setActive(0);
        }
      }}
    >
      <Primitive.Trigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm transition-colors",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-primary-subtle",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          invalid && "border-destructive-border bg-destructive-subtle",
          className,
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            chosen ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {chosen ? (
            <span className="flex items-center gap-2">
              {showThumbs && <Thumb src={chosen.image} className="size-6" />}
              <span className="truncate">
                <span className="tabular font-medium">{chosen.label}</span>
                {chosen.hint && (
                  <span className="ml-1.5 text-muted-foreground">
                    {chosen.hint}
                  </span>
                )}
              </span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Primitive.Trigger>

      <Primitive.Portal>
        <Primitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "z-50 w-(--radix-popover-trigger-width) min-w-56 overflow-hidden rounded-md border border-border bg-card shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          )}
        >
          <div className="relative border-b border-border-subtle">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {visible.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {empty}
              </p>
            )}
            {visible.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => pick(option)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm",
                  index === active && "bg-secondary",
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    option.value === value
                      ? "text-primary"
                      : "text-transparent",
                  )}
                />
                {showThumbs && <Thumb src={option.image} className="size-8" />}
                <span className="min-w-0">
                  <span className="tabular block truncate font-medium">
                    {option.label}
                  </span>
                  {option.hint && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
