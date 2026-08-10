"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { DerivedField, Field, FieldRow } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useCategories, useSave } from "@/lib/queries";
import { cbm, format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import type { DisplayProduct } from "@/types";

type Draft = {
  id?: number;
  style_no: string;
  description: string;
  category: number | null;
  customs_description: string;
  hsn_code: string;
  status: "active" | "inactive";
  product_weight_kg: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
};

const BLANK: Draft = {
  style_no: "",
  description: "",
  category: null,
  customs_description: "",
  hsn_code: "",
  status: "active",
  product_weight_kg: null,
  length_in: null,
  width_in: null,
  height_in: null,
};

export function DisplayProductForm({ product }: { product?: DisplayProduct }) {
  const router = useRouter();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(
    product ? { ...product, category: product.category } : BLANK,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = useCategories({ is_active: true });
  const save = useSave<Draft, DisplayProduct>("display-products");

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const number = (value: string) => (value === "" ? null : Number(value));

  function submit() {
    const found: Record<string, string> = {};
    if (!draft.style_no.trim()) found.style_no = "Required";
    if (!draft.description.trim()) found.description = "Required";

    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Fix the highlighted fields.");
      return;
    }

    save.mutate(draft, {
      onSuccess: () => {
        toast.success(product ? "Product updated" : "Product created");
        router.push("/display/products");
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          const field = error.fieldError("style_no");
          if (field) setErrors({ style_no: field });
          toast.error(field ?? error.detail);
        } else {
          toast.error("Could not save the product");
        }
      },
    });
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        <PageHeader
          title={product ? product.style_no : "New display product"}
          description="A display item has no box of its own — the pack template carries it."
        />

        <Card>
          <CardHeader>
            <CardTitle>Item</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <FieldRow className="sm:grid-cols-2">
              <Field label="Style No" required error={errors.style_no || undefined}>
                <Input
                  value={draft.style_no}
                  invalid={Boolean(errors.style_no)}
                  onChange={(event) => set({ style_no: event.target.value })}
                  placeholder="DSP-WRT-24"
                  className="tabular"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={draft.status}
                  onChange={(event) =>
                    set({ status: event.target.value as Draft["status"] })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </FieldRow>

            <Field
              label="Description"
              required
              error={errors.description || undefined}
            >
              <Input
                value={draft.description}
                invalid={Boolean(errors.description)}
                onChange={(event) => set({ description: event.target.value })}
                placeholder={'24" Pine Wreath'}
              />
            </Field>

            <Field label="Category">
              <Select
                value={draft.category ?? ""}
                onChange={(event) =>
                  set({ category: number(event.target.value) })
                }
              >
                <option value="">No category</option>
                {(categories.data?.results ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customs</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="Customs description"
              hint="The formal name for shipping documents; often differs from the description."
            >
              <Input
                value={draft.customs_description}
                onChange={(event) =>
                  set({ customs_description: event.target.value })
                }
                placeholder="Artificial Foliage Wreath"
              />
            </Field>
            <Field label="HSN code">
              <Input
                value={draft.hsn_code}
                onChange={(event) => set({ hsn_code: event.target.value })}
                placeholder="8507.60"
                className="tabular sm:w-40"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Size and weight</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="Dimensions (in)"
              hint="The item itself. Used for customs and to warn when a template's box is mostly air."
            >
              <div className="flex items-center gap-2">
                {(["length_in", "width_in", "height_in"] as const).map((key) => (
                  <Input
                    key={key}
                    type="number"
                    step="0.01"
                    value={draft[key] ?? ""}
                    onChange={(event) =>
                      set({ [key]: number(event.target.value) } as Partial<Draft>)
                    }
                    placeholder={key === "length_in" ? "L" : key === "width_in" ? "W" : "H"}
                    className="tabular text-center"
                  />
                ))}
              </div>
            </Field>

            <Field label="Product weight (kg)" hint="The bare item, no packaging.">
              <Input
                type="number"
                step="0.001"
                value={draft.product_weight_kg ?? ""}
                onChange={(event) =>
                  set({ product_weight_kg: number(event.target.value) })
                }
                className="tabular sm:w-48"
              />
            </Field>

            <DerivedField
              label="Item volume"
              value={format.cbm(
                cbm(draft.length_in, draft.width_in, draft.height_in),
              )}
              unit="CBM"
            />
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/display/products")}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>
    </main>
  );
}
