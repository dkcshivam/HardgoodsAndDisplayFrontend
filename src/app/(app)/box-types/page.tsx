"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Field, FieldRow } from "@/components/ui/field";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm";
import {
  DialogRoot,
  DialogContent,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useBoxTypes, useRemove, useSave } from "@/lib/queries";
import { cbm, format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import type { BoxType } from "@/types";

type Draft = Partial<BoxType>;

const BLANK: Draft = {
  code: "",
  name: "",
  length_in: undefined,
  width_in: undefined,
  height_in: undefined,
  max_weight_kg: null,
  is_active: true,
};

export default function BoxTypesPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<BoxType | null>(null);

  const { data, isLoading, isError } = useBoxTypes({ search });
  const rows = data?.results ?? [];

  const save = useSave<Draft>("box-types");
  const remove = useRemove("box-types");
  const toast = useToast();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <PageHeader
          title="Box Types"
          description="Reusable carton specifications. Picking one on a product fills its dimensions."
          actions={
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus /> New box type
            </Button>
          }
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search code or name…"
        />

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH className="text-right">L × W × H (in)</TH>
                <TH className="text-right">CBM</TH>
                <TH className="text-right">Max weight</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={7}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={7}>
                  <span className="text-destructive">Could not load box types.</span>
                </EmptyRow>
              )}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={7}>
                  No box types yet. Add the cartons you keep in the warehouse.
                </EmptyRow>
              )}
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="tabular font-medium">{row.code}</TD>
                  <TD>{row.name}</TD>
                  <TD className="tabular text-right">
                    {format.dimensions(row.length_in, row.width_in, row.height_in)}
                  </TD>
                  <TD className="tabular text-right text-secondary-foreground">
                    {format.cbm(row.cbm)}
                  </TD>
                  <TD className="tabular text-right text-secondary-foreground">
                    {row.max_weight_kg == null
                      ? "—"
                      : `${format.weight(row.max_weight_kg)} kg`}
                  </TD>
                  <TD>
                    <Badge tone={row.is_active ? "success" : "neutral"}>
                      {row.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive-subtle"
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      {editing && (
        <BoxTypeDialog
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={(record) =>
            save.mutate(record, {
              onSuccess: () => {
                toast.success(record.id ? "Box type updated" : "Box type created");
                setEditing(null);
              },
              onError: (error) =>
                toast.error(
                  error instanceof ApiError
                    ? (error.fieldError("code") ?? error.detail)
                    : "Could not save",
                ),
            })
          }
          saving={save.isPending}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete box type"
        message={`Delete ${deleting?.code}? Products already using it keep their dimensions.`}
        busy={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Box type deleted");
              setDeleting(null);
            },
            onError: () => toast.error("Could not delete — it may be in use"),
          })
        }
      />
    </main>
  );
}

function BoxTypeDialog({
  draft,
  onClose,
  onSave,
  saving,
}: {
  draft: Draft;
  onClose: () => void;
  onSave: (record: Draft) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const set = (patch: Draft) => setForm((current) => ({ ...current, ...patch }));

  const volume = cbm(
    form.length_in ?? null,
    form.width_in ?? null,
    form.height_in ?? null,
  );

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={draft.id ? "Edit box type" : "New box type"}
        description="Standard dimensions. They stay editable wherever this type is used."
      >
        <DialogBody className="space-y-4">
          <FieldRow className="sm:grid-cols-2">
            <Field label="Code" required htmlFor="code">
              <Input
                id="code"
                value={form.code ?? ""}
                onChange={(event) => set({ code: event.target.value })}
                placeholder="STD-M"
              />
            </Field>
            <Field label="Name" required htmlFor="name">
              <Input
                id="name"
                value={form.name ?? ""}
                onChange={(event) => set({ name: event.target.value })}
                placeholder="Standard Medium"
              />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Length (in)" required>
              <Input
                type="number"
                step="0.01"
                value={form.length_in ?? ""}
                onChange={(event) =>
                  set({ length_in: numberOrUndefined(event.target.value) })
                }
              />
            </Field>
            <Field label="Width (in)" required>
              <Input
                type="number"
                step="0.01"
                value={form.width_in ?? ""}
                onChange={(event) =>
                  set({ width_in: numberOrUndefined(event.target.value) })
                }
              />
            </Field>
            <Field label="Height (in)" required>
              <Input
                type="number"
                step="0.01"
                value={form.height_in ?? ""}
                onChange={(event) =>
                  set({ height_in: numberOrUndefined(event.target.value) })
                }
              />
            </Field>
          </FieldRow>

          <div className="rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Volume</span>
            <span className="tabular ml-2 font-semibold text-primary">
              {format.cbm(volume)} CBM
            </span>
          </div>

          <Field
            label="Max weight (kg)"
            hint="Optional. What this carton can safely carry."
          >
            <Input
              type="number"
              step="0.001"
              value={form.max_weight_kg ?? ""}
              onChange={(event) =>
                set({ max_weight_kg: numberOrNull(event.target.value) })
              }
            />
          </Field>

          <Field label="Status">
            <Select
              value={form.is_active ? "active" : "inactive"}
              onChange={(event) =>
                set({ is_active: event.target.value === "active" })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" onClick={() => onSave(form)} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function numberOrUndefined(value: string) {
  return value === "" ? undefined : Number(value);
}

function numberOrNull(value: string) {
  return value === "" ? null : Number(value);
}
