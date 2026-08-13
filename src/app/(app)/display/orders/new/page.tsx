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
import {
  useDisplayProducts,
  useMerchants,
  useSave,
  useStores,
} from "@/lib/queries";
import { format } from "@/lib/calc";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DisplayOrder } from "@/types";

/** One store's demand for one product. The unit the order is really made of. */
interface Row {
  store: number;
  product: number | null;
  color: string;
  quantity: number | null;
}

export default function NewDisplayOrderPage() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState<number | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [chosen, setChosen] = useState<number[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk fill — the fast path when most stores want the same thing.
  const [bulkProduct, setBulkProduct] = useState<number | null>(null);
  const [bulkColor, setBulkColor] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState<number | null>(null);

  const merchants = useMerchants({ is_active: true });
  const products = useDisplayProducts({ status: "active" });
  // Every store is a checkbox here, so the grid must hold the whole list.
  const stores = useStores({ is_active: true, page_size: 1000 });
  const save = useSave<Record<string, unknown>, DisplayOrder>("display-orders");

  const catalogue = products.data?.results ?? [];
  const storeList = stores.data?.results ?? [];
  const onOrder = storeList.filter((store) => chosen.includes(store.id));
  const activeStore = onOrder.find((store) => store.id === active) ?? onOrder[0];

  const rowsFor = (store: number) => rows.filter((row) => row.store === store);
  const unitsFor = (store: number) =>
    rowsFor(store).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
  const totalUnits = rows.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
  const emptyStores = onOrder.filter((store) => unitsFor(store.id) === 0);

  function toggleStore(id: number) {
    setChosen((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    // Dropping a store takes its demand with it, so a hidden row cannot be
    // submitted for a store no longer on the order.
    setRows((current) =>
      chosen.includes(id) ? current.filter((row) => row.store !== id) : current,
    );
  }

  function fillEveryStore() {
    if (!bulkProduct || !bulkQuantity || onOrder.length === 0) {
      toast.error("Choose a product and a quantity first.");
      return;
    }
    setRows((current) => {
      const next = [...current];
      for (const store of onOrder) {
        const at = next.findIndex(
          (row) => row.store === store.id && row.product === bulkProduct,
        );
        const row = {
          store: store.id,
          product: bulkProduct,
          color: bulkColor.trim(),
          quantity: bulkQuantity,
        };
        if (at >= 0) next[at] = row;
        else next.push(row);
      }
      return next;
    });
    const label = catalogue.find((item) => item.id === bulkProduct)?.style_no;
    toast.success(
      `${label} × ${bulkQuantity} set on ${onOrder.length} store${onOrder.length === 1 ? "" : "s"}`,
    );
  }

  function setRow(index: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function submit() {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Required";
    if (!merchant) found.merchant = "Required";
    if (onOrder.length === 0) found.stores = "Choose at least one store.";

    const complete = rows.filter((row) => row.product !== null && row.quantity);
    if (complete.length === 0) found.rows = "Give at least one store a product.";
    else if (rows.some((row) => row.product === null || !row.quantity))
      found.rows = "Every line needs a product and a quantity.";

    const keys = complete.map((row) => `${row.store}:${row.product}`);
    if (new Set(keys).size !== keys.length)
      found.rows = "A store lists the same product twice.";

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
        lines: complete.map((row) => ({
          store: row.store,
          product: row.product,
          color: row.color.trim(),
          quantity: row.quantity,
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
      <div className="mx-auto max-w-5xl space-y-5 pb-10">
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
            <div>
              <CardTitle>Stores on this order</CardTitle>
              {errors.stores && (
                <p className="mt-0.5 text-xs text-destructive">
                  {errors.stores}
                </p>
              )}
            </div>
            {storeList.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setChosen(storeList.map((store) => store.id))}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setChosen([]);
                    setRows([]);
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </CardHeader>
          <CardBody>
            {storeList.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No stores yet — add them under Admin → Stores.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {storeList.map((store) => (
                  <label
                    key={store.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-xs",
                      chosen.includes(store.id)
                        ? "border-primary/40 bg-primary-subtle"
                        : "border-border bg-card",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(store.id)}
                      onChange={() => toggleStore(store.id)}
                      className="mt-0.5 size-4 accent-[var(--color-primary)]"
                    />
                    <span>
                      <span className="tabular font-medium">{store.code}</span>{" "}
                      {store.name}
                      <span className="block text-muted-foreground">
                        {[store.ship_city, store.ship_state]
                          .filter(Boolean)
                          .join(", ") || "no address"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {onOrder.length > 0 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>What each store wants</CardTitle>
                {errors.rows && (
                  <p className="mt-0.5 text-xs text-destructive">
                    {errors.rows}
                  </p>
                )}
              </div>
            </CardHeader>

            {/* Most stores usually take the same thing; this sets them all at
                once, and the per-store editor below handles the exceptions. */}
            <CardBody className="border-b border-border-subtle bg-secondary/30">
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Product" className="min-w-56 flex-1">
                  <Select
                    value={bulkProduct ?? ""}
                    onChange={(event) =>
                      setBulkProduct(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">Choose a product</option>
                    {catalogue.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.style_no} · {item.description}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Colour" className="w-36">
                  <Input
                    value={bulkColor}
                    onChange={(event) => setBulkColor(event.target.value)}
                  />
                </Field>
                <Field label="Qty each" className="w-28">
                  <Input
                    type="number"
                    min={1}
                    value={bulkQuantity ?? ""}
                    onChange={(event) =>
                      setBulkQuantity(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value) || null,
                      )
                    }
                    className="tabular text-right"
                  />
                </Field>
                <Button variant="secondary" onClick={fillEveryStore}>
                  Fill all {onOrder.length} stores
                </Button>
              </div>
            </CardBody>

            <div className="grid gap-0 lg:grid-cols-[16rem_1fr]">
              <div className="border-b border-border-subtle lg:border-b-0 lg:border-r">
                {onOrder.map((store) => {
                  const units = unitsFor(store.id);
                  return (
                    <button
                      key={store.id}
                      onClick={() => setActive(store.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 border-b border-border-subtle px-4 py-2.5 text-left text-xs last:border-b-0",
                        activeStore?.id === store.id
                          ? "bg-primary-subtle"
                          : "hover:bg-secondary/50",
                      )}
                    >
                      <span>
                        <span className="tabular font-medium">
                          {store.code}
                        </span>
                        <span className="block text-muted-foreground">
                          {store.name}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "tabular shrink-0 font-semibold",
                          units === 0 ? "text-warning" : "text-primary",
                        )}
                      >
                        {units === 0 ? "empty" : format.integer(units)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div>
                {activeStore && (
                  <>
                    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
                      <span className="text-xs font-medium">
                        <span className="tabular">{activeStore.code}</span>{" "}
                        {activeStore.name}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setRows([
                            ...rows,
                            {
                              store: activeStore.id,
                              product: null,
                              color: "",
                              quantity: null,
                            },
                          ])
                        }
                      >
                        <Plus /> Add product
                      </Button>
                    </div>
                    <Table>
                      <THead>
                        <tr>
                          <TH>Product</TH>
                          <TH className="w-36">Colour</TH>
                          <TH className="w-24 text-right">Quantity</TH>
                          <TH className="w-12" />
                        </tr>
                      </THead>
                      <tbody>
                        {rowsFor(activeStore.id).length === 0 && (
                          <EmptyRow colSpan={4}>
                            Nothing for this store yet.
                          </EmptyRow>
                        )}
                        {rows.map((row, index) =>
                          row.store !== activeStore.id ? null : (
                            <TR key={index}>
                              <TD>
                                <Select
                                  value={row.product ?? ""}
                                  onChange={(event) =>
                                    setRow(index, {
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
                                  value={row.color}
                                  onChange={(event) =>
                                    setRow(index, { color: event.target.value })
                                  }
                                />
                              </TD>
                              <TD>
                                <Input
                                  type="number"
                                  min={1}
                                  value={row.quantity ?? ""}
                                  onChange={(event) =>
                                    setRow(index, {
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
                                    setRows(rows.filter((_, i) => i !== index))
                                  }
                                >
                                  <Trash2 />
                                </Button>
                              </TD>
                            </TR>
                          ),
                        )}
                      </tbody>
                    </Table>
                  </>
                )}
              </div>
            </div>

            <CardBody className="border-t border-border-subtle bg-secondary/30 text-xs text-muted-foreground">
              <span className="tabular font-semibold text-foreground">
                {format.integer(totalUnits)}
              </span>{" "}
              units across{" "}
              <span className="tabular font-semibold text-foreground">
                {onOrder.length - emptyStores.length}
              </span>{" "}
              of {onOrder.length} stores
              {emptyStores.length > 0 && (
                <span className="text-warning">
                  {" "}
                  · {emptyStores.length} still empty (
                  {emptyStores.map((store) => store.code).join(", ")})
                </span>
              )}
              .
            </CardBody>
          </Card>
        )}

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
