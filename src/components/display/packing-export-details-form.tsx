"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FileSpreadsheet, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { DisplayOrder, ExportDetails } from "@/types";

interface PackingExportDetailsFormProps {
  order: DisplayOrder;
  onSave: (details: ExportDetails, options?: { onSuccess?: () => void; onError?: () => void }) => void;
  isSaving: boolean;
}

export function PackingExportDetailsForm({
  order,
  onSave,
  isSaving,
}: PackingExportDetailsFormProps) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(true);

  const initial = order.export_details ?? {};

  const [form, setForm] = useState<ExportDetails>({
    invoice_number: initial.invoice_number ?? "",
    invoice_date: initial.invoice_date ?? "",
    po_number: initial.po_number ?? "",
    lc_number_date: initial.lc_number_date ?? "",
    other_reference: initial.other_reference ?? "",
    other_consignee: initial.other_consignee ?? "",
    final_destination_country: initial.final_destination_country ?? "",
    place_of_receipt: initial.place_of_receipt ?? "",
    vessel_flight_no: initial.vessel_flight_no ?? "",
    port_of_loading: initial.port_of_loading ?? "",
    port_of_discharge: initial.port_of_discharge ?? "",
    final_destination: initial.final_destination ?? "",
    shipping_line: initial.shipping_line ?? "",
    container_no: initial.container_no ?? "",
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (order.export_details) {
      setForm((prev) => ({
        ...prev,
        ...order.export_details,
      }));
    }
  }, [order.export_details]);

  function handleChange(field: keyof ExportDetails, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  function handleSave() {
    onSave(form, {
      onSuccess: () => {
        setIsDirty(false);
        toast.success("Packing list details saved successfully");
      },
      onError: () => {
        toast.error("Failed to save packing list details");
      },
    });
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" />
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              Packing List Header Details
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Fill in the export & shipping details that appear in the downloaded Excel packing list.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={handleSave}
            className="gap-1.5"
          >
            <Save className="size-3.5" />
            {isSaving ? "Saving…" : isDirty ? "Save Details" : "Saved"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Collapse section" : "Expand section"}
          >
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardBody className="border-t border-border/50 pt-4 space-y-4">
          {/* Row 1: Invoicing & Reference */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invoice & Reference
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <Field label="Invoice No">
                <Input
                  value={form.invoice_number ?? ""}
                  placeholder="e.g. DKCP-ABC"
                  onChange={(e) => handleChange("invoice_number", e.target.value)}
                />
              </Field>
              <Field label="Invoice Date">
                <Input
                  value={form.invoice_date ?? ""}
                  placeholder="e.g. 1-07-2026"
                  onChange={(e) => handleChange("invoice_date", e.target.value)}
                />
              </Field>
              <Field label="P.O. No.">
                <Input
                  value={form.po_number ?? ""}
                  placeholder="e.g. 4500123456"
                  onChange={(e) => handleChange("po_number", e.target.value)}
                />
              </Field>
              <Field label="LC No & Date">
                <Input
                  value={form.lc_number_date ?? ""}
                  placeholder="e.g. LC NO. ... DATED: ..."
                  onChange={(e) => handleChange("lc_number_date", e.target.value)}
                />
              </Field>
              <Field label="Other Reference">
                <Input
                  value={form.other_reference ?? ""}
                  placeholder="e.g. HOLIDAY BULK ORDER - SEA USA"
                  onChange={(e) => handleChange("other_reference", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Row 2: Consignee & Routing */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Consignee & Destination
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <Field
                  label="Other Consignee (Shipp To-)"
                  hint="Company name, contact person, street address, and phone number"
                >
                  <Textarea
                    rows={3}
                    value={form.other_consignee ?? ""}
                    placeholder={"L&J Transportation\nATTN: Stephanie Witmyer\n190 Yarnell Road\nPottstown, PA 19465\nPhone Number 484-644-3009"}
                    onChange={(e) => handleChange("other_consignee", e.target.value)}
                    className="text-xs font-mono"
                  />
                </Field>
              </div>
              <div className="space-y-3">
                <Field label="Country of Final Destination">
                  <Input
                    value={form.final_destination_country ?? ""}
                    placeholder="e.g. USA"
                    onChange={(e) =>
                      handleChange("final_destination_country", e.target.value)
                    }
                  />
                </Field>
                <Field label="Final Destination">
                  <Input
                    value={form.final_destination ?? ""}
                    placeholder="e.g. Pottstown, PA"
                    onChange={(e) => handleChange("final_destination", e.target.value)}
                  />
                </Field>
              </div>
              <div className="space-y-3">
                <Field label="Place of Receipt">
                  <Input
                    value={form.place_of_receipt ?? ""}
                    placeholder="e.g. ICD DADRI"
                    onChange={(e) => handleChange("place_of_receipt", e.target.value)}
                  />
                </Field>
                <Field label="Vessel / Flight No">
                  <Input
                    value={form.vessel_flight_no ?? ""}
                    placeholder="e.g. BY SEA"
                    onChange={(e) => handleChange("vessel_flight_no", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Row 3: Ports & Container */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ports & Shipment Details
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Field label="Port of Loading">
                <Input
                  value={form.port_of_loading ?? ""}
                  placeholder="e.g. ICD DADRI"
                  onChange={(e) => handleChange("port_of_loading", e.target.value)}
                />
              </Field>
              <Field label="Port of Discharge">
                <Input
                  value={form.port_of_discharge ?? ""}
                  placeholder="e.g. NEWYORK"
                  onChange={(e) => handleChange("port_of_discharge", e.target.value)}
                />
              </Field>
              <Field label="Shipping Line">
                <Input
                  value={form.shipping_line ?? ""}
                  placeholder="e.g. MAERSK / MSC"
                  onChange={(e) => handleChange("shipping_line", e.target.value)}
                />
              </Field>
              <Field label="Container No">
                <Input
                  value={form.container_no ?? ""}
                  placeholder="e.g. MSKU1234567"
                  onChange={(e) => handleChange("container_no", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </CardBody>
      )}
    </Card>
  );
}
