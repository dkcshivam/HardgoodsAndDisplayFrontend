"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  THead,
  TH,
  SortTH,
  TR,
  TD,
  EmptyRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ImportGapPanel, type GapItem } from "@/components/display/import-gap-panel";
import { ApiError } from "@/lib/api";
import { useImportGap } from "@/lib/import-gap";
import { find, index, sameName } from "@/lib/order-sheet";
import { useCategories, useDisplayProducts, useRemove } from "@/lib/queries";
import { format } from "@/lib/calc";
import { mainImage } from "@/lib/images";
import { useSort } from "@/lib/sort";
import type { DisplayProduct } from "@/types";

export default function DisplayProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [deleting, setDeleting] = useState<DisplayProduct | null>(null);
  const remove = useRemove("display-products");
  const toast = useToast();

  // The whole list, because sorting a page of it would order the wrong rows.
  const { data, isLoading, isError } = useDisplayProducts({
    search,
    status,
    category,
    page_size: 1000,
  });
  const categories = useCategories({ is_active: true });
  const rows = data?.results ?? [];

  const { sort, toggle, sorted } = useSort(rows, {
    style_no: (row) => row.style_no,
    description: (row) => row.description,
    category: (row) => row.category_name,
    hsn: (row) => row.hsn_code,
    hts: (row) => row.hts_code,
    // The cell shows three figures; length is the one people scan by.
    size: (row) => row.length_in,
    weight: (row) => row.product_weight_kg,
    cbm: (row) => row.unit_cbm,
    status: (row) => row.status,
  });

  const router = useRouter();
  const gap = useImportGap();
  // Matched against the whole catalogue rather than the filtered table, so a
  // search or a status filter cannot make the list look finished.
  const everyProduct = useDisplayProducts(
    { page_size: 1000 },
    { enabled: gap !== null },
  );

  const outstanding = useMemo<GapItem[]>(() => {
    if (!gap) return [];
    const byStyle = index(everyProduct.data?.results ?? [], (item) => item.style_no);

    const items: GapItem[] = [];
    for (const want of gap.products) {
      const found = find(byStyle, want.style_no);
      if (!found) {
        items.push({ id: want.style_no, label: want.style_no, hint: want.style_name });
        continue;
      }
      // The number is taken but the name does not agree. It cannot be created
      // twice, so it stays on the list saying why rather than quietly passing.
      if (!sameName(found.style_name, want.style_name)) {
        items.push({
          id: want.style_no,
          label: want.style_no,
          hint: want.style_name,
          blocked: `on file as “${found.style_name || "no name"}”`,
        });
      }
    }
    return items;
  }, [gap, everyProduct.data]);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div
        className={
          gap
            ? "mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
            : "mx-auto max-w-6xl"
        }
      >
        <div className="space-y-5">
        <PageHeader
          title="Display products"
          actions={
            <Button size="sm" asChild>
              <Link href="/display/products/new">
                <Plus /> New product
              </Link>
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search style no, name or description…"
          />
          <Select
            className="w-40"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {(categories.data?.results ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <Card>
          <Table>
            <THead>
              <tr>
                <TH className="w-14" />
                <SortTH column="style_no" sort={sort} onSort={toggle}>
                  Style No
                </SortTH>
                <SortTH column="description" sort={sort} onSort={toggle}>
                  Description
                </SortTH>
                <SortTH column="category" sort={sort} onSort={toggle}>
                  Category
                </SortTH>
                <SortTH column="hsn" sort={sort} onSort={toggle}>
                  HSN
                </SortTH>
                <SortTH column="hts" sort={sort} onSort={toggle}>
                  HTS
                </SortTH>
                <SortTH column="size" sort={sort} onSort={toggle} className="text-center">
                  L × W × H (in)
                </SortTH>
                <SortTH column="weight" sort={sort} onSort={toggle} className="text-right">
                  Weight (kg)
                </SortTH>
                <SortTH column="cbm" sort={sort} onSort={toggle} className="text-right">
                  CBM
                </SortTH>
                <SortTH column="status" sort={sort} onSort={toggle}>
                  Status
                </SortTH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={11}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={11}>
                  <span className="text-destructive">
                    Could not load display products.
                  </span>
                </EmptyRow>
              )}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={11}>
                  No display products yet. Create one to start building
                  templates.
                </EmptyRow>
              )}
              {sorted.map((product) => {
                const photo = mainImage(product.images);
                return (
                <TR key={product.id}>
                  <TD className="pr-0">
                    {photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photo}
                        alt=""
                        className="size-9 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/50">
                        <ImageOff className="size-3.5" />
                      </div>
                    )}
                  </TD>
                  <TD>
                    <Link
                      href={`/display/products/${product.id}`}
                      className="tabular font-medium hover:text-primary"
                    >
                      {product.style_no}
                    </Link>
                    {product.style_name && (
                      <div className="text-xs text-muted-foreground">
                        {product.style_name}
                      </div>
                    )}
                  </TD>
                  <TD className="text-secondary-foreground">
                    {product.description}
                  </TD>
                  <TD className="text-secondary-foreground">
                    {product.category_name || "—"}
                  </TD>
                  <TD className="tabular text-secondary-foreground">
                    {product.hsn_code || "—"}
                  </TD>
                  <TD className="tabular text-secondary-foreground">
                    {product.hts_code || "—"}
                  </TD>
                  <TD className="tabular text-center text-secondary-foreground">
                    {format.dimensions(
                      product.length_in,
                      product.width_in,
                      product.height_in,
                    )}
                  </TD>
                  <TD className="tabular text-right">
                    {product.product_weight_kg == null
                      ? "—"
                      : format.weight(product.product_weight_kg)}
                  </TD>
                  <TD className="tabular text-right text-muted-foreground">
                    {format.cbm(product.unit_cbm)}
                  </TD>
                  <TD>
                    <Badge
                      tone={product.status === "active" ? "success" : "neutral"}
                    >
                      {product.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive-subtle"
                      onClick={() => setDeleting(product)}
                    >
                      <Trash2 />
                    </Button>
                  </TD>
                </TR>
                );
              })}
            </tbody>
          </Table>
        </Card>
        </div>

        {/* Held back until the list is in: an empty one would show things
            that are already added as still outstanding. */}
        {gap && everyProduct.data && (
          <ImportGapPanel
            title="Products to add"
            sheet={gap.sheet}
            orderName={gap.order_name}
            items={outstanding}
            total={gap.products.length}
            onAdd={(item) =>
              router.push(
                `/display/products/new?style_no=${encodeURIComponent(item.id)}` +
                  `&style_name=${encodeURIComponent(item.hint ?? "")}`,
              )
            }
          />
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this product?"
        message={`Delete ${deleting?.style_no}? Its parts and photos go with it. A product already on an order or in a template is kept — you will be told which holds it.`}
        busy={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`${deleting.style_no} deleted`);
              setDeleting(null);
            },
            onError: (error) => {
              setDeleting(null);
              toast.error(
                error instanceof ApiError
                  ? error.detail
                  : "Could not delete this product",
              );
            },
          })
        }
      />
    </main>
  );
}
