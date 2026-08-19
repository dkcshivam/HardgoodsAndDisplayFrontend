"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { BoxSticker } from "@/components/packing/box-sticker";
import { inRange, paginate, ROWS_PER_PAGE } from "@/lib/stickers";
import type { Sticker } from "@/lib/stickers";

/**
 * The print screen: a toolbar that never prints, and below it the sheets
 * exactly as they will come out. What you see is what the printer gets —
 * the same markup, so a preview cannot drift from the paper.
 */
export function StickerSheet({
  title,
  subtitle,
  backHref,
  stickers,
  loading,
  filters,
  notice,
}: {
  title: string;
  subtitle: string;
  backHref: string;
  stickers: Sticker[];
  loading: boolean;
  filters?: React.ReactNode;
  notice?: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [perPage, setPerPage] = useState(String(ROWS_PER_PAGE));
  const [photos, setPhotos] = useState(true);

  const pages = useMemo(
    () => paginate(inRange(stickers, from, to), Number(perPage) || ROWS_PER_PAGE),
    [stickers, from, to, perPage],
  );

  return (
    <main className="min-h-full bg-muted print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-x-4 gap-y-3">
          <div className="mr-auto">
            <Link
              href={backHref}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3" /> Back to packing
            </Link>
            <h1 className="text-base font-semibold">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          {filters}

          <Labelled label="From box">
            <Input
              className="tabular w-20"
              inputMode="numeric"
              placeholder="001"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Labelled>
          <Labelled label="To box">
            <Input
              className="tabular w-20"
              inputMode="numeric"
              placeholder="all"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Labelled>
          <Labelled label="Rows per sheet">
            <Input
              className="tabular w-16"
              inputMode="numeric"
              value={perPage}
              onChange={(event) => setPerPage(event.target.value)}
            />
          </Labelled>
          <Labelled label="Photos">
            <Select
              className="w-20"
              value={photos ? "on" : "off"}
              onChange={(event) => setPhotos(event.target.value === "on")}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </Select>
          </Labelled>

          <Button onClick={() => window.print()} disabled={pages.length === 0}>
            <Printer />
            {pages.length === 1 ? "Print 1 sheet" : `Print ${pages.length} sheets`}
          </Button>
        </div>
        {notice && (
          <p className="mx-auto mt-2 max-w-5xl text-xs text-warning">{notice}</p>
        )}
      </div>

      {loading && (
        <p className="no-print p-10 text-center text-sm text-muted-foreground">
          Loading boxes…
        </p>
      )}
      {!loading && pages.length === 0 && (
        <p className="no-print p-10 text-center text-sm text-muted-foreground">
          No boxes to print. Clear the range, or pack the order first.
        </p>
      )}

      <div className="flex flex-col items-center gap-6 p-6 print:gap-0 print:p-0">
        {pages.map((page) => (
          <BoxSticker
            key={`${page.sticker.box_no}-${page.page}`}
            page={page}
            photos={photos}
          />
        ))}
      </div>
    </main>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
