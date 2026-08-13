"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
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

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
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
    </main>
  );
}
