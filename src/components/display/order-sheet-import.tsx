"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileSpreadsheet,
  Package,
  Store as StoreIcon,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveGap } from "@/lib/import-gap";
import {
  find,
  index,
  matchSheet,
  parseSheet,
  readWorkbook,
  SheetError,
  type SheetRead,
  type WorkbookSheet,
} from "@/lib/order-sheet";
import { cn } from "@/lib/utils";
import type { DisplayProduct, Store } from "@/types";

/** One store's demand for one style, once both have been found in the app. */
export interface FilledLine {
  store: number;
  product: number;
  quantity: number;
}

/** A tab that is not an order sheet is skipped, not shouted about. */
function tryParse(sheet: WorkbookSheet): SheetRead | null {
  try {
    return parseSheet(sheet);
  } catch {
    return null;
  }
}

export function OrderSheetImport({
  orderName,
  products,
  stores,
  loading,
  failed,
  onFill,
}: {
  orderName: string;
  products: DisplayProduct[];
  stores: Store[];
  /** Whether the catalogue this is checked against has actually arrived. */
  loading: boolean;
  failed: boolean;
  onFill: (storeIds: number[], lines: FilledLine[]) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const picker = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<WorkbookSheet[]>([]);
  const [read, setRead] = useState<SheetRead | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = useMemo(
    () => (read ? read.stores.filter((name) => !dropped.has(name)) : []),
    [read, dropped],
  );

  // An empty catalogue would make every style and store on the sheet look
  // missing, which is a far more alarming lie than saying nothing yet.
  const known = !loading && !failed;

  const match = useMemo(
    () => (read && known ? matchSheet(read, chosen, products, stores) : null),
    [read, known, chosen, products, stores],
  );

  /** The file is opened once and every tab kept, so switching is instant. */
  async function load(chosenFile: File) {
    setBusy(true);
    setError(null);
    try {
      const all = await readWorkbook(chosenFile);
      setFile(chosenFile);
      setSheets(all);

      // Land on the first tab that actually looks like an order sheet rather
      // than on whatever happens to be leftmost.
      const first = all.map(tryParse).find(Boolean) ?? null;
      if (!first) {
        throw new SheetError("No tab in that file has a Style No column.");
      }
      setRead(first);
      setDropped(new Set());
    } catch (problem) {
      setRead(null);
      setError(
        problem instanceof SheetError
          ? problem.message
          : "Could not read that file. Is it an .xlsx?",
      );
    } finally {
      setBusy(false);
    }
  }

  function switchTo(name: string) {
    const sheet = sheets.find((item) => item.name === name);
    if (!sheet) return;
    try {
      setRead(parseSheet(sheet));
      setDropped(new Set());
      setError(null);
    } catch (problem) {
      setRead(null);
      setError(
        problem instanceof SheetError ? problem.message : "Could not read that sheet.",
      );
    }
  }

  /** Hands the sheet to the form, which is where it is reviewed and saved. */
  function apply() {
    if (!read || !match || !known) return;

    const byStore = index(stores, (item) => item.name);
    const byStyle = index(products, (item) => item.style_no);

    const storeIds: number[] = [];
    for (const name of chosen) {
      const store = find(byStore, name);
      if (store && !storeIds.includes(store.id)) storeIds.push(store.id);
    }

    const lines: FilledLine[] = [];
    for (const line of read.lines) {
      const product = find(byStyle, line.style_no);
      if (!product) continue;
      for (const name of chosen) {
        const quantity = line.quantities[name] ?? 0;
        const store = find(byStore, name);
        if (quantity > 0 && store) {
          lines.push({ store: store.id, product: product.id, quantity });
        }
      }
    }

    onFill(storeIds, lines);
    toast.success(
      `${lines.length} line${lines.length === 1 ? "" : "s"} filled in across ${
        storeIds.length
      } store${storeIds.length === 1 ? "" : "s"} — check them below, then create the order.`,
    );
  }

  /** Parks what is missing where the stores and products screens can see it. */
  function handOff(to: "/stores" | "/display/products") {
    if (!read || !match) return;
    saveGap({
      order_name: orderName.trim() || "this order",
      sheet: read.sheet,
      stores: match.missing_stores,
      products: match.missing_products.map(({ style_no, style_name }) => ({
        style_no,
        style_name,
      })),
      saved_at: new Date().toISOString(),
    });
    router.push(to);
  }

  const clashes = match?.missing_products.filter((item) => item.known_as) ?? [];
  const ready =
    match !== null &&
    match.missing_stores.length === 0 &&
    match.missing_products.length === 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Build from the order sheet</CardTitle>
        </div>
        {file && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              setRead(null);
              setSheets([]);
              setError(null);
            }}
          >
            <X /> Clear
          </Button>
        )}
      </CardHeader>

      <CardBody className="space-y-4">
        {!file ? (
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-input px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {busy ? "Reading…" : "Choose an .xlsx order sheet"}
            </span>
          </button>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{file.name}</span>
            </div>
            {sheets.length > 1 && (
              <Field label="Sheet" className="w-56">
                <Select
                  value={read?.sheet ?? ""}
                  disabled={busy}
                  onChange={(event) => switchTo(event.target.value)}
                >
                  {sheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>
                      {sheet.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}

        <input
          ref={picker}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            const chosenFile = event.target.files?.[0];
            if (chosenFile) load(chosenFile);
            event.target.value = "";
          }}
        />

        {error && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {read && !known && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            {failed
              ? "Your stores and products could not be loaded, so this sheet cannot be checked against them. Reload the page and try again."
              : "Loading your stores and products…"}
          </p>
        )}

        {read && match && (
          <>
            <div className="rounded-lg border border-border bg-secondary/40 px-3.5 py-3">
              <div className="text-xs text-muted-foreground">
                Header on row {read.header_row} · {read.lines.length} style rows ·{" "}
                {read.stores.length} store columns
                {read.duplicate_stores.length > 0 &&
                  ` · ${read.duplicate_stores.length} repeated heading ignored`}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {chosen.length} of {read.stores.length} counted as stores. Click
                one to leave it out — a totals or stock column sometimes sits in
                the same run and is not a store.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {read.stores.map((name) => {
                  const on = !dropped.has(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() =>
                        setDropped((current) => {
                          const next = new Set(current);
                          if (on) next.add(name);
                          else next.delete(name);
                          return next;
                        })
                      }
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                        on
                          ? "border-border bg-card text-secondary-foreground hover:border-primary/50"
                          : "border-dashed border-input bg-transparent text-muted-foreground line-through",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {ready ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/40 bg-success-subtle px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  <div className="text-sm">
                    <div className="font-medium">
                      Every style and store on this sheet is already in the app.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.total_quantity} units across {chosen.length} stores
                      {match.unordered > 0 &&
                        ` · ${match.unordered} style rows ordered nothing and are skipped`}
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={apply}>
                  Fill the order <ArrowRight />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>
                    Add the{" "}
                    {[
                      match.missing_stores.length > 0 && "stores",
                      match.missing_products.length > 0 && "products",
                    ]
                      .filter(Boolean)
                      .join(" and ")}{" "}
                    below first. The list follows you to that screen and shrinks
                    as you save.
                  </span>
                </p>

                {match.missing_stores.length > 0 && (
                <MissingList
                  icon={<StoreIcon className="size-4" />}
                  title="Stores"
                  count={match.missing_stores.length}
                  action="Go to stores"
                  onGo={() => handOff("/stores")}
                >
                  {match.missing_stores.map((name) => (
                    <li key={name} className="tabular">
                      {name}
                    </li>
                  ))}
                </MissingList>
                )}

                {match.missing_products.length > 0 && (
                <MissingList
                  icon={<Package className="size-4" />}
                  title="Products"
                  count={match.missing_products.length}
                  action="Go to products"
                  onGo={() => handOff("/display/products")}
                >
                  {match.missing_products.map((item) => (
                    <li key={item.style_no}>
                      <span className="tabular font-medium">{item.style_no}</span>
                      {item.style_name && (
                        <span className="text-muted-foreground"> · {item.style_name}</span>
                      )}
                      {item.known_as && (
                        <span className="text-warning">
                          {" "}
                          — on file under the name “{item.known_as}”
                        </span>
                      )}
                    </li>
                  ))}
                </MissingList>
                )}

                {clashes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {clashes.length} style number
                    {clashes.length === 1 ? " is" : "s are"} already in use under a
                    different name. A style number cannot be created twice — fix
                    the name in the sheet, or rename the product.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function MissingList({
  icon,
  title,
  count,
  action,
  onGo,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  action: string;
  onGo: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
          <span className="text-warning">
            {count} missing
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={onGo}>
          {action} <ArrowRight />
        </Button>
      </div>
      <div className="max-h-56 overflow-y-auto px-3.5 py-2.5">
        <ul className="space-y-1 text-sm">{children}</ul>
      </div>
    </div>
  );
}
