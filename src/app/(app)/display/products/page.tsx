"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { ImportGapPanel, type GapItem } from "@/components/display/import-gap-panel";
import { useImportGap } from "@/lib/import-gap";
import { find, index, sameName } from "@/lib/order-sheet";
import { useCategories, useDisplayProducts } from "@/lib/queries";
import { format } from "@/lib/calc";

export default function DisplayProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const { data, isLoading, isError } = useDisplayProducts({
    search,
    status,
    category,
  });
  const categories = useCategories({ is_active: true });
  const rows = data?.results ?? [];

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
          description="Store decor and small goods. Each one ships inside a pack template's box, never its own."
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
                <TH>Style No</TH>
                <TH>Description</TH>
                <TH>Category</TH>
                <TH>HSN</TH>
                <TH className="text-center">L × W × H (in)</TH>
                <TH className="text-right">Weight (kg)</TH>
                <TH className="text-right">CBM</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={8}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={8}>
                  <span className="text-destructive">
                    Could not load display products.
                  </span>
                </EmptyRow>
              )}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={8}>
                  No display products yet. Create one to start building
                  templates.
                </EmptyRow>
              )}
              {rows.map((product) => (
                <TR key={product.id}>
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
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
        </div>

        {gap && (
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
    </main>
  );
}
