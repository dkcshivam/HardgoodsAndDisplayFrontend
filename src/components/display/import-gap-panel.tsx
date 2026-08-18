"use client";

import Link from "next/link";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { clearGap } from "@/lib/import-gap";

export interface GapItem {
  id: string;
  label: string;
  hint?: string;
  /** Blocked items are shown struck through — adding them would be refused. */
  blocked?: string;
}

/**
 * What an order sheet still wants, pinned beside the screen that can supply
 * it. The list is worked out from the live data every render, so a row leaves
 * the moment its store or product saves — nobody ticks anything off by hand.
 */
export function ImportGapPanel({
  title,
  sheet,
  orderName,
  items,
  total,
  onAdd,
}: {
  title: string;
  sheet: string;
  orderName: string;
  items: GapItem[];
  total: number;
  onAdd: (item: GapItem) => void;
}) {
  const done = total - items.length;

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <Card>
        <CardBody className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">{title}</div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                for {orderName} · {sheet}
              </p>
            </div>
            <button
              type="button"
              onClick={clearGap}
              title="Drop this list"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${total === 0 ? 100 : (done / total) * 100}%` }}
              />
            </div>
            <span className="tabular text-xs text-muted-foreground">
              {done}/{total}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                All added. Go back and upload the sheet again.
              </p>
              <Button size="sm" className="w-full" asChild>
                <Link href="/display/orders/new" onClick={clearGap}>
                  Back to the order <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="-mx-1 max-h-[26rem] space-y-0.5 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={Boolean(item.blocked)}
                    onClick={() => onAdd(item)}
                    className="group flex w-full items-start gap-2 rounded px-1.5 py-1.5 text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-60"
                  >
                    <Plus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.label}</span>
                      {item.hint && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                      {item.blocked && (
                        <span className="block text-xs text-warning">{item.blocked}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </aside>
  );
}
