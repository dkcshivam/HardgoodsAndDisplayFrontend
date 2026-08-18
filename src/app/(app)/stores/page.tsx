"use client";

import { useMemo, useState } from "react";
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
import { ImportGapPanel, type GapItem } from "@/components/display/import-gap-panel";
import { useImportGap } from "@/lib/import-gap";
import { find, index } from "@/lib/order-sheet";
import { useRemove, useSave, useStores } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { Store } from "@/types";

type Draft = Partial<Store>;

const BLANK: Draft = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  ship_line1: "",
  ship_line2: "",
  ship_city: "",
  ship_state: "",
  ship_postal_code: "",
  ship_country: "US",
  is_active: true,
};

export default function StoresPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Store | null>(null);

  const { data, isLoading } = useStores({ search });
  const rows = data?.results ?? [];

  // An order sheet may have sent us here with a list of stores to add. It is
  // matched against every store, not the search results, so typing in the box
  // does not make the list look finished.
  const gap = useImportGap();
  const everyStore = useStores({ page_size: 1000 }, { enabled: gap !== null });

  const outstanding = useMemo<GapItem[]>(() => {
    if (!gap) return [];
    const known = index(everyStore.data?.results ?? [], (store) => store.name);
    return gap.stores
      .filter((name) => !find(known, name))
      .map((name) => ({ id: name, label: name }));
  }, [gap, everyStore.data]);

  const save = useSave<Draft>("stores");
  const remove = useRemove("stores");
  const toast = useToast();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div
        className={
          gap
            ? "mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
            : "mx-auto max-w-5xl"
        }
      >
        <div className="space-y-5">
        <PageHeader
          title="Stores"
          description="Every outlet we ship to. Any order can use any of them."
          actions={
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus /> New store
            </Button>
          }
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search store name or city…"
        />

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Store</TH>
                <TH>Ships to</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={4}>Loading…</EmptyRow>}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={4}>
                  {search
                    ? "No stores match."
                    : "No stores yet. Add the outlets we ship to."}
                </EmptyRow>
              )}
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="text-secondary-foreground">
                    {[row.ship_city, row.ship_state, row.ship_country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                    {row.ship_line1 && (
                      <div className="text-xs text-muted-foreground">
                        {row.ship_line1}
                      </div>
                    )}
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

        {gap && (
          <ImportGapPanel
            title="Stores to add"
            sheet={gap.sheet}
            orderName={gap.order_name}
            items={outstanding}
            total={gap.stores.length}
            onAdd={(item) => setEditing({ ...BLANK, name: item.label })}
          />
        )}
      </div>

      {editing && (
        <StoreDialog
          draft={editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(record) =>
            save.mutate(record, {
              onSuccess: () => {
                toast.success(record.id ? "Store updated" : "Store created");
                setEditing(null);
              },
              onError: (error) =>
                toast.error(
                  error instanceof ApiError
                    ? (error.fieldError("name") ?? error.detail)
                    : "Could not save",
                ),
            })
          }
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete store"
        message={`Delete ${deleting?.name}? Orders already placed keep the reference.`}
        busy={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Store deleted");
              setDeleting(null);
            },
            onError: () =>
              toast.error("Could not delete — orders still reference it"),
          })
        }
      />
    </main>
  );
}

function StoreDialog({
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

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={draft.id ? "Edit store" : "New store"}>
        <DialogBody className="space-y-4">
          <Field
            label="Store"
            required
            hint='Number and name together, e.g. "118 Portland Pearl".'
          >
            <Input
              value={form.name ?? ""}
              onChange={(event) => set({ name: event.target.value })}
            />
          </Field>

          <Field label="Address">
            <Input
              value={form.ship_line1 ?? ""}
              onChange={(event) => set({ ship_line1: event.target.value })}
            />
          </Field>
          <Field label="Address line 2">
            <Input
              value={form.ship_line2 ?? ""}
              onChange={(event) => set({ ship_line2: event.target.value })}
            />
          </Field>

          <FieldRow className="sm:grid-cols-4">
            <Field label="City" className="sm:col-span-2">
              <Input
                value={form.ship_city ?? ""}
                onChange={(event) => set({ ship_city: event.target.value })}
              />
            </Field>
            <Field label="State">
              <Input
                value={form.ship_state ?? ""}
                onChange={(event) => set({ ship_state: event.target.value })}
              />
            </Field>
            <Field label="Postcode">
              <Input
                value={form.ship_postal_code ?? ""}
                onChange={(event) =>
                  set({ ship_postal_code: event.target.value })
                }
                className="tabular"
              />
            </Field>
          </FieldRow>

          <FieldRow className="sm:grid-cols-2">
            <Field label="Country" hint="Two-letter ISO code.">
              <Input
                maxLength={2}
                value={form.ship_country ?? ""}
                onChange={(event) =>
                  set({ ship_country: event.target.value.toUpperCase() })
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
          </FieldRow>

          <FieldRow className="sm:grid-cols-3">
            <Field label="Contact name">
              <Input
                value={form.contact_name ?? ""}
                onChange={(event) => set({ contact_name: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(event) => set({ email: event.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone ?? ""}
                onChange={(event) => set({ phone: event.target.value })}
              />
            </Field>
          </FieldRow>
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
