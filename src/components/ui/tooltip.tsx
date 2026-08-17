"use client";

import { Tooltip as Primitive } from "radix-ui";

/**
 * A hover label for something whose short form is the one people say out loud
 * — a style number — and whose long form they only occasionally need.
 *
 * Renders the child alone when there is nothing to say, so a caller can pass
 * a possibly-blank label without guarding it.
 */
export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (!label) return <>{children}</>;

  return (
    <Primitive.Provider delayDuration={150}>
      <Primitive.Root>
        <Primitive.Trigger asChild>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content
            sideOffset={6}
            className="z-50 max-w-64 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
          >
            {label}
            <Primitive.Arrow className="fill-card" />
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
