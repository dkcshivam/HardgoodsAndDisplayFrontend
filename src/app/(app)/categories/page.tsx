"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
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
import { useCategories, useRemove, useSave } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { Category } from "@/types";

type Draft = Partial<Category>;

export default function CategoriesPage() {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const { data, isLoading } = useCategories();
  const rows = data?.results ?? [];

  const save = useSave<Draft>("categories");
  const remove = useRemove("categories");
  const toast = useToast();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          title="Categories"
          description="A product label. Set once per product, never per part."
          actions={
            <Button
              size="sm"
              onClick={() => setEditing({ name: "", is_active: true })}
            >
              <Plus /> New category
            </Button>
          }
        />

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={3}>Loading…</EmptyRow>}
              {!isLoading && rows.length === 0 && (
                <EmptyRow colSpan={3}>No categories yet.</EmptyRow>
              )}
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">{row.name}</TD>
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
        <CategoryDialog
          draft={editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(record) =>
            save.mutate(record, {
              onSuccess: () => {
                toast.success(record.id ? "Category updated" : "Category created");
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
        title="Delete category"
        message={`Delete ${deleting?.name}?`}
        busy={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Category deleted");
              setDeleting(null);
            },
            onError: () =>
              toast.error("Could not delete — products still use it"),
          })
        }
      />
    </main>
  );
}

function CategoryDialog({
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
      <DialogContent
        title={draft.id ? "Edit category" : "New category"}
        className="max-w-md"
      >
        <DialogBody className="space-y-4">
          <Field label="Name" required htmlFor="name">
            <Input
              id="name"
              value={form.name ?? ""}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Table"
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.is_active ? "active" : "inactive"}
              onChange={(event) =>
                setForm({ ...form, is_active: event.target.value === "active" })
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
