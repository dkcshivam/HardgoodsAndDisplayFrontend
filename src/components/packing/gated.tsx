"use client";

import { Tooltip } from "@/components/ui/tooltip";

/**
 * Explains why a header action is unavailable. The reason hangs off a span
 * because a disabled button has no pointer events, so its own tooltip — or a
 * title attribute — never fires.
 */
export function Gated({
  reason,
  children,
}: {
  reason: string;
  children: React.ReactNode;
}) {
  if (!reason) return <>{children}</>;

  return (
    <Tooltip label={reason}>
      <span className="inline-flex">{children}</span>
    </Tooltip>
  );
}
