"use client";

import { Fragment, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { ChevronRight, X } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { SearchInput } from "@/components/ui/search-input";
import { Pager } from "@/components/ui/pager";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { ChangeList, changeSummary } from "@/components/activity/change-list";
import { useAuditEvents, useIsAdmin, useUsers } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { format } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { AuditAction } from "@/types";

const ACTIONS: { value: AuditAction; label: string }[] = [
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "advance_status", label: "Advanced status" },
  { value: "save_packing", label: "Saved packing" },
  { value: "auto_pack", label: "Auto-packed" },
  { value: "add_step", label: "Added step" },
  { value: "update_step", label: "Changed step" },
  { value: "delete_step", label: "Removed step" },
  { value: "replicate", label: "Copied plan" },
  { value: "login", label: "Logged in" },
  { value: "logout", label: "Logged out" },
];

const TARGET_TYPES = [
  { value: "orders.order", label: "Hardgoods order" },
  { value: "catalog.product", label: "Hardgoods product" },
  { value: "catalog.productimage", label: "Hardgoods photo" },
  { value: "display.displayorder", label: "Display order" },
  { value: "display.displayproduct", label: "Display product" },
  { value: "display.displayproductimage", label: "Display photo" },
  { value: "display.packtemplate", label: "Box design" },
  { value: "masters.category", label: "Category" },
  { value: "masters.merchant", label: "Merchant" },
  { value: "masters.store", label: "Store" },
  { value: "auth.user", label: "User" },
];

const TONE: Partial<Record<AuditAction, "success" | "danger" | "neutral">> = {
  create: "success",
  add_step: "success",
  delete: "danger",
  delete_step: "danger",
  login: "neutral",
  logout: "neutral",
};

// The search box is left out: written to the URL on every keystroke, the
// router's catch-up would fight the cursor.
const URL_FILTERS = [
  "actor",
  "action",
  "target_type",
  "target_id",
  "created_after",
  "created_before",
] as const;
type UrlFilter = (typeof URL_FILTERS)[number] | "page";

function Activity() {
  const isAdmin = useIsAdmin();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const filters = Object.fromEntries(
    URL_FILTERS.map((key) => [key, params.get(key) ?? ""]),
  ) as Record<(typeof URL_FILTERS)[number], string>;
  const page = Number(params.get("page")) || 1;

  /**
   * Filters live in the URL so another screen can link straight to a record's
   * history. Native replaceState updates useSearchParams without a server trip.
   */
  function update(patch: Partial<Record<UrlFilter, string>>) {
    // The live URL, not `params`, which can trail it by a render.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in patch)) next.delete("page");
    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  const events = useAuditEvents(
    { ...filters, search, page },
    { enabled: isAdmin, placeholderData: keepPreviousData },
  );
  const users = useUsers(
    { page_size: 1000, ordering: "username" },
    { enabled: isAdmin },
  );
  const rows = events.data?.results ?? [];
  const filtered = Boolean(search) || URL_FILTERS.some((key) => filters[key]);

  if (
    !isAdmin ||
    (events.error instanceof ApiError && events.error.status === 403)
  ) {
    return <NoAccess />;
  }

  const toggle = (id: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Named after the newest event, which is what the record is called now.
  const named = events.isPlaceholderData ? undefined : rows[0];
  const record = filters.target_id
    ? named
      ? `${named.target_label} ${named.target_repr}`
      : `#${filters.target_id}`
    : null;

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          title="Activity"
          description="Every change made through the app: who, what, and when."
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              update({});
            }}
            placeholder="Search record or user…"
          />
          <Select
            className="w-40"
            value={filters.actor}
            onChange={(event) => update({ actor: event.target.value })}
          >
            <option value="">All users</option>
            {(users.data?.results ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={filters.action}
            onChange={(event) => update({ action: event.target.value })}
          >
            <option value="">All actions</option>
            {ACTIONS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </Select>
          <Select
            className="w-44"
            value={filters.target_type}
            // A record id means nothing once its type changes.
            onChange={(event) =>
              update({ target_type: event.target.value, target_id: "" })
            }
          >
            <option value="">All records</option>
            {TARGET_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            From
            <div className="w-36">
              <DateInput
                value={filters.created_after}
                onChange={(value) => update({ created_after: value })}
              />
            </div>
            to
            <div className="w-36">
              <DateInput
                value={filters.created_before}
                onChange={(value) => update({ created_before: value })}
              />
            </div>
          </div>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                update(Object.fromEntries(URL_FILTERS.map((key) => [key, ""])));
              }}
            >
              <X /> Clear
            </Button>
          )}
        </div>

        {record && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">History of</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle py-0.5 pl-2.5 pr-1 font-medium text-primary">
              {record}
              <button
                type="button"
                aria-label="Show every record"
                className="rounded-full p-0.5 hover:bg-primary/10"
                onClick={() => update({ target_id: "" })}
              >
                <X className="size-3.5" />
              </button>
            </span>
          </div>
        )}

        <Card>
          <Table>
            <THead>
              <tr>
                <TH className="w-8 pr-0" />
                <TH>When</TH>
                <TH>Who</TH>
                <TH>Action</TH>
                <TH>What</TH>
                <TH>Changes</TH>
              </tr>
            </THead>
            <tbody>
              {events.isLoading && <EmptyRow colSpan={6}>Loading…</EmptyRow>}
              {events.isError && (
                <EmptyRow colSpan={6}>
                  <span className="text-destructive">Could not load activity.</span>
                </EmptyRow>
              )}
              {!events.isLoading && !events.isError && rows.length === 0 && (
                <EmptyRow colSpan={6}>
                  {filtered ? "Nothing matches these filters." : "Nothing recorded yet."}
                </EmptyRow>
              )}
              {rows.map((event) => {
                const fields = Object.keys(event.changes).length;
                const open = expanded.has(event.id);
                return (
                  <Fragment key={event.id}>
                    <TR
                      className={cn(fields > 0 && "cursor-pointer", open && "border-b-0")}
                      onClick={() => fields > 0 && toggle(event.id)}
                    >
                      <TD className="w-8 pr-0">
                        {fields > 0 && (
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={open ? "Hide changes" : "Show changes"}
                            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={(click) => {
                              click.stopPropagation();
                              toggle(event.id);
                            }}
                          >
                            <ChevronRight
                              className={cn("size-4 transition-transform", open && "rotate-90")}
                            />
                          </button>
                        )}
                      </TD>
                      <TD className="tabular whitespace-nowrap text-secondary-foreground">
                        {format.dateTime(event.created_at)}
                      </TD>
                      <TD className="whitespace-nowrap">{event.actor_name || "—"}</TD>
                      <TD>
                        <Badge tone={TONE[event.action] ?? "info"}>
                          {event.action_label}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="text-[11px] text-muted-foreground">
                          {event.target_label}
                        </div>
                        <button
                          type="button"
                          title="Only this record's history"
                          className="text-left font-medium hover:text-primary"
                          onClick={(click) => {
                            click.stopPropagation();
                            update({
                              target_type: event.target_type,
                              target_id: event.target_id,
                            });
                          }}
                        >
                          {event.target_repr}
                        </button>
                      </TD>
                      <TD className="max-w-80 truncate text-secondary-foreground">
                        {changeSummary(event.changes) || "—"}
                      </TD>
                    </TR>
                    {open && (
                      <tr className="border-b border-border-subtle last:border-0">
                        <td />
                        <td colSpan={5} className="px-4 pb-3 pt-0.5">
                          <div className="rounded-md bg-secondary/60 px-3 py-2.5">
                            <ChangeList changes={event.changes} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
          <Pager
            page={page}
            data={events.data}
            onChange={(next) => update({ page: next > 1 ? String(next) : "" })}
          />
        </Card>
      </div>
    </main>
  );
}

export default function ActivityPage() {
  return (
    <Suspense>
      <Activity />
    </Suspense>
  );
}
