"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The frame both printable documents share: a toolbar that never prints, and
 * the paper below it drawn exactly as it will come out.
 *
 * A4 is declared in CSS, so the browser's print dialog opens on it already.
 * Nothing can pre-select "black and white" from a page — no CSS reaches that
 * control — so the documents are drawn in black, white and grey instead, and
 * come out monochrome whichever way the dialog is set.
 */
export function DocumentShell({
  title,
  subtitle,
  backHref,
  orientation = "portrait",
  loading,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  backHref: string;
  orientation?: "portrait" | "landscape";
  loading: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-full bg-muted print:bg-white">
      {/* Per document, because the two want different paper. */}
      <style>{`@media print { @page { size: A4 ${orientation}; margin: 10mm; } }`}</style>

      <div className="no-print sticky top-0 z-10 border-b border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-4">
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
          <p className="text-xs text-muted-foreground">
            A4 {orientation} · black and white · choose “Save as PDF” to keep a
            copy
          </p>
          <Button onClick={() => window.print()} disabled={loading || !!error}>
            <Printer /> Print
          </Button>
        </div>
      </div>

      {loading && (
        <p className="no-print p-10 text-center text-sm text-muted-foreground">
          Building the document…
        </p>
      )}
      {error && (
        <p className="no-print p-10 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-center p-6 print:block print:p-0">
        {children}
      </div>
    </main>
  );
}
