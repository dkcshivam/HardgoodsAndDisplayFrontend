"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `2026-07-01` → `01/07/2026`; anything else shows as it was saved. */
function display(value: string) {
  const match = ISO_DATE.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/**
 * A date that always reads dd/mm/yyyy and is picked from the calendar. A
 * native date input takes its format from the browser's locale — dd-mm-yyyy
 * in India — and cannot be told otherwise, so one sits invisible over this
 * field only to supply the calendar. The value stays ISO, `yyyy-mm-dd`.
 */
export function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const open = () => picker.current?.showPicker?.();

  return (
    <div className="relative">
      <Input
        readOnly
        value={display(value)}
        onClick={open}
        onKeyDown={(event) => {
          if (["Enter", " ", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            open();
          }
        }}
        className="cursor-pointer pr-9"
      />
      <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={ISO_DATE.test(value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0"
      />
    </div>
  );
}
