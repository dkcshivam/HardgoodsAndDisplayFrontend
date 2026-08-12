"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Field, FieldRow } from "@/components/ui/field";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useDisplayProducts, useMerchants, useSave } from "@/lib/queries";
import { format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import type { DisplayOrder, ShippingAddress } from "@/types";

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

export default function NewDisplayOrderPage() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState<number | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [address, setAddress] = useState<ShippingAddress>(BLANK_ADDRESS);
  const [lines, setLines] = useState<LineDraft[]>([BLANK_LINE]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const merchants = useMerchants({ is_active: true });
  const products = useDisplayProducts({ status: "active" });
  const save = useSave<Record<string, unknown>, DisplayOrder>("display-orders");

  const catalogue = products.data?.results ?? [];
  const setLine = (index: number, patch: Partial<LineDraft>) =>
    setLines((all) =>
      all.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );

  const totalUnits = lines.reduce(
    (sum, line) => (line.product ? sum + (line.quantity ?? 0) : sum),
    0,
  );

  function submit() {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Required";
    if (!merchant) found.merchant = "Required";

    const filled = lines.filter((line) => line.product !== null);
    if (filled.length === 0) found.lines = "Add at least one product.";

    const ids = filled.map((line) => line.product);
    if (new Set(ids).size !== ids.length)
      found.lines =
        "Each product can appear only once. Change the quantity instead.";

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
          toast.success(`Order ${order.number} created`);
          router.push(`/display/orders/${order.id}/packing`);
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.detail : "Could not create order",
          ),
      },
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        <PageHeader
          title="New display order"
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
              <Field
                label="Merchant"
                required
                error={errors.merchant || undefined}
              >
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
              <Field label="Buyer name">
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
                <TH className="w-12" />
              </tr>
            </THead>
            <tbody>
              {lines.length === 0 && <EmptyRow colSpan={4}>No lines yet.</EmptyRow>}
              {lines.map((line, index) => (
                <TR key={index}>
                  <TD>
                    <Select
                      value={line.product ?? ""}
                      onChange={(event) =>
                        setLine(index, {
                          product: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">Choose a product</option>
                      {catalogue.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.style_no} · {item.description}
                        </option>
                      ))}
                    </Select>
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
                      className="tabular text-right"
                    />
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
              ))}
            </tbody>
          </Table>
          <CardBody className="border-t border-border-subtle bg-secondary/30 text-xs text-muted-foreground">
            <span className="tabular font-semibold text-foreground">
              {format.integer(totalUnits)}
            </span>{" "}
            units. How many cartons that becomes is decided on the packing
            screen, by applying templates until nothing is left.
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/display/orders")}
          >
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
