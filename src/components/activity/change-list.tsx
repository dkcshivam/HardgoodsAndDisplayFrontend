import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditEvent, AuditValue } from "@/types";

type Changes = AuditEvent["changes"];

const humanize = (field: string) => field.replace(/_/g, " ");

function isShort(value: AuditValue) {
  return value === null || (typeof value !== "object" && String(value).length <= 24);
}

function text(value: AuditValue): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return value === "" ? "(blank)" : String(value);
}

/** One line for the table: the change itself when it is small, else the fields it touched. */
export function changeSummary(changes: Changes): string {
  const fields = Object.keys(changes);
  if (fields.length === 0) return "";
  if (fields.length === 1) {
    const [before, after] = changes[fields[0]];
    if (isShort(before) && isShort(after)) {
      return `${humanize(fields[0])}: ${text(before)} → ${text(after)}`;
    }
  }
  const named = fields.slice(0, 3).map(humanize).join(", ");
  return fields.length > 3 ? `${named} and ${fields.length - 3} more` : named;
}

function Value({ value, muted }: { value: AuditValue; muted?: boolean }) {
  return (
    <span
      className={cn(
        "min-w-0 whitespace-pre-wrap break-words",
        typeof value === "object" && value !== null && "font-mono text-[11px]",
        (muted || value === null) && "text-muted-foreground",
      )}
    >
      {text(value)}
    </span>
  );
}

/** Every field, before → after. A dash before means created; a dash after, deleted. */
export function ChangeList({ changes }: { changes: Changes }) {
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-xs">
      {Object.entries(changes).map(([field, [before, after]]) => (
        <div key={field} className="contents">
          <dt className="font-medium capitalize text-secondary-foreground">
            {humanize(field)}
          </dt>
          <dd className="flex flex-wrap items-baseline gap-x-1.5">
            <Value value={before} muted />
            <ArrowRight className="size-3 shrink-0 self-center text-muted-foreground" />
            <Value value={after} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
