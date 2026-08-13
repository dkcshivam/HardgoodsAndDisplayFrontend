"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { TemplateDialog } from "@/components/display/template-dialog";
import { usePackTemplates, useRemove } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { format } from "@/lib/calc";
import type { PackTemplate } from "@/types";

export default function PackTemplatesPage() {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("true");
  const [editing, setEditing] = useState<PackTemplate | undefined>();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<PackTemplate | null>(null);

  const { data, isLoading, isError, refetch } = usePackTemplates({
    search,
    is_library: scope,
  });
  const rows = data?.results ?? [];

  const remove = useRemove("pack-templates");
  const toast = useToast();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          title="Pack templates"
          description="A box design: what goes inside, and the box itself. Reused across orders."
          actions={
            <Button
              size="sm"
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus /> New template
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search code or name…"
          />
          <Select
            className="w-56"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="true">Library templates</option>
            <option value="false">One-offs</option>
            <option value="">All templates</option>
          </Select>
        </div>

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Contents</TH>
                <TH>Merchant</TH>
                <TH className="text-center">Box L × W × H (in)</TH>
                <TH className="text-right">Units</TH>
                <TH className="text-right">Gross (kg)</TH>
                <TH className="text-right">CBM</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={8}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={8}>
                  <span className="text-destructive">
                    Could not load templates.
                  </span>
                </EmptyRow>
              )}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={8}>
                  No templates here yet. Create one, or build it in-flow from a
                  packing screen where you can see what the order has left.
                </EmptyRow>
              )}
              {rows.map((template) => (
                <TR key={template.id}>
                  <TD>
                    <button
                      onClick={() => {
                        setEditing(template);
                        setOpen(true);
                      }}
                      className="tabular font-medium hover:text-primary"
                    >
                      {template.code}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {template.name}
                    </div>
                  </TD>
                  <TD>
                    <div className="space-y-0.5">
                      {template.items.map((item) => (
                        <div key={item.id} className="text-xs">
                          <span className="tabular font-medium text-primary">
                            {item.quantity}×
                          </span>{" "}
                          <span className="tabular">
                            {item.product_style_no}
                          </span>
                          {/* Two parts of one product are two rows that would
                              otherwise read as the same style number twice. */}
                          {item.part_name && (
                            <span className="text-muted-foreground">
                              {" "}
                              — {item.part_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TD>
                  <TD className="text-secondary-foreground">
                    {template.merchant_name ?? (
                      <span className="text-muted-foreground">All</span>
                    )}
                  </TD>
                  <TD className="tabular text-center text-secondary-foreground">
                    {format.dimensions(
                      template.box_length_in,
                      template.box_width_in,
                      template.box_height_in,
                    )}
                  </TD>
                  <TD className="tabular text-right">{template.total_units}</TD>
                  <TD className="tabular text-right">
                    {format.weight(template.gross_weight_kg)}
                  </TD>
                  <TD className="tabular text-right text-muted-foreground">
                    {format.cbm(template.cbm)}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      {!template.is_library && (
                        <Badge tone="neutral">one-off</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(template);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive-subtle"
                        onClick={() => setDeleting(template)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <div className="border-t border-border-subtle px-5 py-3 text-xs text-muted-foreground">
            Gross and volume describe a <em>full</em> box. A part-filled carton
            is weighed from what is actually inside it.
          </div>
        </Card>
      </div>

      <TemplateDialog
        open={open}
        onOpenChange={setOpen}
        template={editing}
        onSaved={() => refetch()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this box design?"
        message={`Delete ${deleting?.code}? A design an order has already packed is kept — you will be told which order holds it.`}
        busy={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`${deleting.code} deleted`);
              setDeleting(null);
              refetch();
            },
            onError: (error) => {
              setDeleting(null);
              toast.error(
                error instanceof ApiError
                  ? error.detail
                  : "Could not delete this design",
              );
            },
          })
        }
      />
    </main>
  );
}
