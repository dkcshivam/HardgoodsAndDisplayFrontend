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
import { useMerchants, useRemove, useSave } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { Merchant } from "@/types";

type Draft = Partial<Merchant>;

const BLANK: Draft = {
  code: "",
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  city: "",
  country: "US",
  is_active: true,
};

export default function MerchantsPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Merchant | null>(null);

  const { data, isLoading } = useMerchants({ search });
  const rows = data?.results ?? [];

  const save = useSave<Draft>("merchants");
  const remove = useRemove("merchants");
  const toast = useToast();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <PageHeader
          title="Merchants"
          description="The customers we ship to."
          actions={
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus /> New merchant
            </Button>
          }
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, code or contact…"
        />

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Contact</TH>
                <TH>Location</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={6}>Loading…</EmptyRow>}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={6}>No merchants yet.</EmptyRow>
              )}
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="tabular font-medium">{row.code}</TD>
                  <TD>{row.name}</TD>
                  <TD className="text-secondary-foreground">
                    {row.contact_name || "—"}
                    {row.email && (
                      <div className="text-xs text-muted-foreground">
                        {row.email}
                      </div>
                    )}
                  </TD>
                  <TD className="text-secondary-foreground">
                    {[row.city, row.country].filter(Boolean).join(", ") || "—"}
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
        <MerchantDialog
          draft={editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(record) =>
            save.mutate(record, {
              onSuccess: () => {
                toast.success(record.id ? "Merchant updated" : "Merchant created");
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
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete merchant"
        message={`Delete ${deleting?.name}? Orders already placed keep the reference.`}
        busy={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Merchant deleted");
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

function MerchantDialog({
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
      <DialogContent title={draft.id ? "Edit merchant" : "New merchant"}>
        <DialogBody className="space-y-4">
          <FieldRow className="sm:grid-cols-2">
            <Field label="Code" required>
              <Input
                value={form.code ?? ""}
                onChange={(event) => set({ code: event.target.value })}
              />
            </Field>
            <Field label="Name" required>
              <Input
                value={form.name ?? ""}
                onChange={(event) => set({ name: event.target.value })}
              />
            </Field>
          </FieldRow>

          <Field label="Contact name">
            <Input
              value={form.contact_name ?? ""}
              onChange={(event) => set({ contact_name: event.target.value })}
            />
          </Field>

          <FieldRow className="sm:grid-cols-2">
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

          <FieldRow className="sm:grid-cols-2">
            <Field label="City">
              <Input
                value={form.city ?? ""}
                onChange={(event) => set({ city: event.target.value })}
              />
            </Field>
            <Field label="Country" hint="Two-letter ISO code.">
              <Input
                maxLength={2}
                value={form.country ?? ""}
                onChange={(event) =>
                  set({ country: event.target.value.toUpperCase() })
                }
              />
            </Field>
          </FieldRow>

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
