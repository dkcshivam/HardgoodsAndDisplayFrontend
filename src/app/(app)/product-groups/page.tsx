"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
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
import { useProductGroups, useRemove, useSave } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { ProductGroup } from "@/types";

type Draft = Partial<ProductGroup>;

export default function ProductGroupsPage() {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<ProductGroup | null>(null);

  const { data, isLoading } = useProductGroups();
  const rows = data?.results ?? [];

  const save = useSave<Draft>("product-groups");
  const remove = useRemove("product-groups");
  const toast = useToast();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <PageHeader
          title="Product Groups"
          description="Products sharing a packing instruction. Cuts across categories."
          actions={
            <Button size="sm" onClick={() => setEditing({ name: "", remark: "" })}>
              <Plus /> New group
            </Button>
          }
        />

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Packing instruction</TH>
                <TH className="text-right">Products</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={4}>Loading…</EmptyRow>}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={4}>No groups yet.</EmptyRow>
              )}
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="max-w-md text-secondary-foreground">
                    {row.remark || <span className="text-muted-foreground">—</span>}
                  </TD>
                  <TD className="text-right">
                    <Badge tone="info">{row.product_count}</Badge>
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
        <GroupDialog
          draft={editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(record) =>
            save.mutate(record, {
              onSuccess: () => {
                toast.success(record.id ? "Group updated" : "Group created");
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
        title="Delete group"
        message={`Delete ${deleting?.name}? Its products stay, without a group.`}
        busy={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Group deleted");
              setDeleting(null);
            },
            onError: () => toast.error("Could not delete"),
          })
        }
      />
    </main>
  );
}

function GroupDialog({
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

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={draft.id ? "Edit group" : "New group"}>
        <DialogBody className="space-y-4">
          <Field label="Name" required htmlFor="name">
            <Input
              id="name"
              value={form.name ?? ""}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Oak Dining Collection"
            />
          </Field>
          <Field
            label="Packing instruction"
            hint="Shown to whoever packs anything in this group."
          >
            <Textarea
              value={form.remark ?? ""}
              onChange={(event) =>
                setForm({ ...form, remark: event.target.value })
              }
              placeholder="Ship with felt pads; keep as a set where possible."
            />
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
