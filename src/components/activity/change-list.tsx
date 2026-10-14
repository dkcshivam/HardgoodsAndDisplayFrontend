import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditEvent, AuditValue } from "@/types";

type Changes = AuditEvent["changes"];

const humanize = (field: string) => field.replace(/_/g, " ");

function isShort(value: AuditValue) {
  return value === null || (typeof value !== "object" && String(value).length <= 24);
}

type Row = { [key: string]: AuditValue };

function text(value: AuditValue): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value) && value.every((item) => typeof item !== "object")) {
    return value.map(text).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value === "" ? "(blank)" : String(value);
}

const isRows = (value: AuditValue): value is Row[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === "object" && item !== null && !Array.isArray(item));

/**
 * Parts, lines and items arrive as [rows removed, rows added] rather than the
 * whole list twice, so a one-line edit to a long order stays one line.
 */
function isCollection([before, after]: [AuditValue, AuditValue]) {
  if (before === null && after === null) return false;
  return (before === null || isRows(before)) && (after === null || isRows(after));
}

const rowText = (row: Row) =>
  Object.entries(row)
    .map(([field, value]) => `${humanize(field)} ${text(value)}`)
    .join(" · ");

const count = (value: AuditValue) => (Array.isArray(value) ? value.length : 0);

/** One line for the table: the change itself when it is small, else the fields it touched. */
export function changeSummary(changes: Changes): string {
  const fields = Object.keys(changes);
  if (fields.length === 0) return "";
  if (fields.length === 1) {
    const [before, after] = changes[fields[0]];
    if (isCollection(changes[fields[0]])) {
      const parts = [
        count(before) && `${count(before)} removed`,
        count(after) && `${count(after)} added`,
      ].filter(Boolean);
      return `${humanize(fields[0])}: ${parts.join(", ")}`;
    }
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

function RowList({ label, rows }: { label: string; rows: AuditValue }) {
  if (!isRows(rows) || rows.length === 0) return null;
  return (
    <div className="space-y-0.5">
      <span className="text-muted-foreground">{label}</span>
      <ul className="space-y-0.5">
        {rows.map((row, index) => (
          <li key={index} className="break-words">
            {rowText(row)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every field, before → after. A dash before means created; a dash after, deleted. */
export function ChangeList({ changes }: { changes: Changes }) {
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-xs">
      {Object.entries(changes).map(([field, change]) => (
        <div key={field} className="contents">
          <dt className="font-medium capitalize text-secondary-foreground">
            {humanize(field)}
          </dt>
          {isCollection(change) ? (
            <dd className="space-y-1.5">
              <RowList label="Removed" rows={change[0]} />
              <RowList label="Added" rows={change[1]} />
            </dd>
          ) : (
            <dd className="flex flex-wrap items-baseline gap-x-1.5">
              <Value value={change[0]} muted />
              <ArrowRight className="size-3 shrink-0 self-center text-muted-foreground" />
              <Value value={change[1]} />
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
