"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogRoot,
  DialogContent,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";

/** One style on the order, and what it sells for on this order. */
export interface RateRow {
  product: number;
  style_no: string;
  name: string;
  rate: string;
}

/**
 * Prices live here rather than on the order form because this is where they
 * are needed — beside the invoice button, once the order is packed and
 * somebody is looking at what actually ships.
 */
export function RatesDialog({
  open,
  onClose,
  rows,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  rows: RateRow[];
  saving: boolean;
  onSave: (rates: Record<number, string>) => void;
}) {
  return (
    <DialogRoot open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Remounted each time it opens, so it shows what is stored rather than
          what somebody typed and then abandoned. */}
      {open && (
        <Sheet
          rows={rows}
          saving={saving}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </DialogRoot>
  );
}

function Sheet({
  rows,
  saving,
  onClose,
  onSave,
}: {
  rows: RateRow[];
  saving: boolean;
  onClose: () => void;
  onSave: (rates: Record<number, string>) => void;
}) {
  const [draft, setDraft] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.product, row.rate])),
  );

  const priced = rows.filter((row) => (draft[row.product] ?? "").trim()).length;

  return (
      <DialogContent
        title="Rates"
        description={`Unit price in US dollars, for this order only. ${priced} of ${rows.length} priced.`}
        className="max-w-xl"
      >
        <DialogBody className="max-h-[60vh] overflow-y-auto p-0">
          <Table>
            <THead>
              <tr>
                <TH>Style No</TH>
                <TH>Name</TH>
                <TH className="w-32 text-right">Rate US$</TH>
              </tr>
            </THead>
            <tbody>
              {rows.length === 0 && (
                <EmptyRow colSpan={3}>Nothing on this order yet.</EmptyRow>
              )}
              {rows.map((row) => (
                <TR key={row.product}>
                  <TD className="tabular font-medium">{row.style_no}</TD>
                  <TD className="text-secondary-foreground">{row.name || "—"}</TD>
                  <TD>
                    <Input
                      className="tabular text-right"
                      inputMode="decimal"
                      placeholder="—"
                      value={draft[row.product] ?? ""}
                      onChange={(event) =>
                        setDraft((all) => ({
                          ...all,
                          [row.product]: event.target.value,
                        }))
                      }
                    />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving} onClick={() => onSave(draft)}>
            {saving ? "Saving…" : "Save rates"}
          </Button>
        </DialogFooter>
      </DialogContent>
  );
}
