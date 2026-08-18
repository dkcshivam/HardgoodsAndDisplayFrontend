"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input, Select } from "@/components/ui/input";
import { Field, FieldRow } from "@/components/ui/field";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useMerchants, useProducts, useSave } from "@/lib/queries";
import { cartonCount } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import type { ShippingAddress } from "@/types";

interface LineDraft {
  product: number | null;
  color: string;
  /** Null while the field is empty — a pre-filled 1 turns a typed 12 into 112. */
  quantity: number | null;
}

const BLANK_LINE: LineDraft = { product: null, color: "", quantity: null };

const BLANK_ADDRESS: ShippingAddress = {
  country: "US",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
};

export default function NewOrderPage() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState<number | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [address, setAddress] = useState<ShippingAddress>(BLANK_ADDRESS);
  const [lines, setLines] = useState<LineDraft[]>([BLANK_LINE]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const merchants = useMerchants({ is_active: true });
  const products = useProducts({ status: "active", page_size: 1000 });
  const save = useSave<Record<string, unknown>>("orders");

  const catalogue = products.data?.results ?? [];
  // Style number first: it is what people say out loud. The description is
  // searched with it, so half a name finds the row too.
  const productOptions: ComboboxOption[] = catalogue.map((item) => ({
    value: item.id,
    label: item.style_no,
    hint: item.description,
  }));
  const setLine = (index: number, patch: Partial<LineDraft>) =>
    setLines((all) =>
      all.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );

  function submit() {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Required";
    if (!merchant) found.merchant = "Required";
    if (!buyerName.trim()) found.buyer_name = "Required";

    const filled = lines.filter((line) => line.product !== null);
    if (filled.length === 0) found.lines = "Add at least one product.";

    const productIds = filled.map((line) => line.product);
    if (new Set(productIds).size !== productIds.length)
      found.lines = "Each product can appear only once. Change the quantity instead.";

    if (filled.some((line) => !line.quantity))
      found.lines = "Give every product a quantity.";

    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Fix the highlighted fields.");
      return;
    }

    save.mutate(
      {
        name,
        merchant,
        buyer_name: buyerName,
        shipping_address: address,
        lines: filled.map((line) => ({
          product: line.product,
          color: line.color.trim(),
          quantity: line.quantity,
        })),
      },
      {
        onSuccess: (order) => {
          toast.success(`Order ${(order as { number: string }).number} created`);
          router.push(`/orders/${(order as { id: number }).id}/packing`);
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.detail : "Could not create order",
          ),
      },
    );
  }

  const estimatedCartons = lines.reduce((sum, line) => {
    const product = catalogue.find((item) => item.id === line.product);
    if (!product) return sum;
    const quantity = line.quantity ?? 0;
    return (
      sum +
      (product.is_multi_part
        ? product.part_count * quantity
        : cartonCount(quantity, product.pack_per_box))
    );
  }, 0);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        <PageHeader
          title="New order"
          description="The order number is generated on save."
        />

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label="Order name" required error={errors.name || undefined}>
              <Input
                value={name}
                invalid={Boolean(errors.name)}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <FieldRow className="sm:grid-cols-2">
              <Field label="Merchant" required error={errors.merchant || undefined}>
                <Select
                  value={merchant ?? ""}
                  invalid={Boolean(errors.merchant)}
                  onChange={(event) =>
                    setMerchant(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                >
                  <option value="">Choose a merchant</option>
                  {(merchants.data?.results ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Buyer name"
                required
                error={errors.buyer_name || undefined}
              >
                <Input
                  value={buyerName}
                  onChange={(event) => setBuyerName(event.target.value)}
                />
              </Field>
            </FieldRow>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ship to</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label="Address line 1">
              <Input
                value={address.line1}
                onChange={(event) =>
                  setAddress({ ...address, line1: event.target.value })
                }
              />
            </Field>
            <Field label="Address line 2">
              <Input
                value={address.line2}
                onChange={(event) =>
                  setAddress({ ...address, line2: event.target.value })
                }
              />
            </Field>
            <FieldRow>
              <Field label="City">
                <Input
                  value={address.city}
                  onChange={(event) =>
                    setAddress({ ...address, city: event.target.value })
                  }
                />
              </Field>
              <Field label="State">
                <Input
                  value={address.state}
                  onChange={(event) =>
                    setAddress({ ...address, state: event.target.value })
                  }
                />
              </Field>
              <Field label="Postal code">
                <Input
                  value={address.postal_code}
                  onChange={(event) =>
                    setAddress({ ...address, postal_code: event.target.value })
                  }
                />
              </Field>
            </FieldRow>
            <Field label="Country" hint="Two-letter ISO code.">
              <Input
                maxLength={2}
                value={address.country}
                onChange={(event) =>
                  setAddress({
                    ...address,
                    country: event.target.value.toUpperCase(),
                  })
                }
                className="sm:w-24"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Products</CardTitle>
              {errors.lines && (
                <p className="mt-0.5 text-xs text-destructive">{errors.lines}</p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLines([...lines, BLANK_LINE])}
            >
              <Plus /> Add line
            </Button>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH className="w-44">Colour</TH>
                <TH className="w-28 text-right">Quantity</TH>
                <TH className="w-32 text-right">Cartons</TH>
                <TH className="w-12" />
              </tr>
            </THead>
            <tbody>
              {lines.length === 0 && (
                <EmptyRow colSpan={5}>No lines yet.</EmptyRow>
              )}
              {lines.map((line, index) => {
                const product = catalogue.find((item) => item.id === line.product);
                const cartons = product
                  ? product.is_multi_part
                    ? product.part_count * (line.quantity ?? 0)
                    : cartonCount(line.quantity ?? 0, product.pack_per_box)
                  : 0;
                return (
                  <TR key={index}>
                    <TD>
                      <Combobox
                        value={line.product}
                        onChange={(value) => setLine(index, { product: value })}
                        options={productOptions}
                        placeholder="Choose a product"
                        searchPlaceholder="Search style no or description…"
                      />
                    </TD>
                    <TD>
                      <Input
                        value={line.color}
                        onChange={(event) =>
                          setLine(index, { color: event.target.value })
                        }
                      />
                    </TD>
                    <TD>
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity ?? ""}
                        onChange={(event) =>
                          setLine(index, {
                            quantity:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value) || null,
                          })
                        }
                        className="text-right tabular"
                      />
                    </TD>
                    <TD className="tabular text-right text-muted-foreground">
                      {product ? cartons : "—"}
                    </TD>
                    <TD>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive-subtle"
                        onClick={() =>
                          setLines(lines.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
          <CardBody className="border-t border-border-subtle bg-secondary/30 text-xs text-muted-foreground">
            Colour is recorded per order — the same style ships in whatever
            finish this merchant asked for, and it prints on the packing list.
            Auto-pack will propose about{" "}
            <span className="tabular font-semibold text-foreground">
              {estimatedCartons}
            </span>{" "}
            cartons. Every one stays editable afterwards.
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push("/orders")}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Creating…" : "Create order"}
          </Button>
        </div>
      </div>
    </main>
  );
}
