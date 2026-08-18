"use client";

import Link from "next/link";
import { useState } from "react";
import { ImageOff, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useCategories, useProducts } from "@/lib/queries";
import { useSort } from "@/lib/sort";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");

  // The whole list, because sorting a page of it would order the wrong rows.
  const { data, isLoading, isError } = useProducts({
    search,
    category,
    status,
    page_size: 1000,
  });
  const categories = useCategories({ is_active: true });
  const rows = data?.results ?? [];

  const { sort, toggle, sorted } = useSort(rows, {
    style_no: (row) => row.style_no,
    description: (row) => row.description,
    category: (row) => row.category_name,
    // Single-box first, then by how many pieces it breaks into.
    packs_as: (row) => (row.is_multi_part ? row.part_count : 0),
  });

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          title="Products"
          description="Describe an item once and it packs correctly forever."
          actions={
            <Button size="sm" asChild>
              <Link href="/products/new">
                <Plus /> New product
              </Link>
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search style no, description, HSN…"
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
            className="w-32"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
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
                <SortTH column="packs_as" sort={sort} onSort={toggle}>
                  Packs as
                </SortTH>
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={5}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={5}>
                  <span className="text-destructive">Could not load products.</span>
                </EmptyRow>
              )}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={5}>
                  Nothing matches. Try clearing the filters.
                </EmptyRow>
              )}
              {sorted.map((row) => (
                <TR key={row.id}>
                  <TD className="pr-0">
                    {row.main_image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={row.main_image}
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
                      href={`/products/${row.id}`}
                      className="tabular font-medium hover:text-primary"
                    >
                      {row.style_no}
                    </Link>
                  </TD>
                  <TD>{row.description}</TD>
                  <TD className="text-secondary-foreground">
                    {row.category_name || "—"}
                  </TD>
                  <TD>
                    {row.is_multi_part ? (
                      <Badge tone="info">{row.part_count} parts</Badge>
                    ) : (
                      <Badge>{row.pack_per_box} per box</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>

        {data && (
          <p className="text-xs text-muted-foreground">
            {rows.length} of {data.count} products
          </p>
        )}
      </div>
    </main>
  );
}
