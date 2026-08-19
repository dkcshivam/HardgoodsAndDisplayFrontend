import { Cell } from "@/components/print/document-cell";
import type { InvoiceDocument } from "@/types";

const QTY = 4;

/**
 * The commercial invoice on paper, in the shape the shipping desk already
 * sends. The heading boxes are ruled and labelled but left empty — invoice
 * number, ports, vessel and LC change per shipment and the app holds none of
 * them, so the desk fills them in by hand or in the PDF.
 */
export function InvoiceDoc({ doc }: { doc: InvoiceDocument }) {
  return (
    <article className="w-[190mm] bg-white p-6 text-[9px] leading-tight text-black shadow-sm print:w-full print:p-0 print:shadow-none">
      <h1 className="border border-black py-1.5 text-center text-base font-bold tracking-[0.12em]">
        {doc.title}
      </h1>

      <div className="grid grid-cols-3 border-x border-b border-black">
        <Party label="Exporter" lines={doc.exporter} className="col-span-1" />
        <Party
          label="Consignee"
          lines={doc.consignee}
          className="col-span-2 border-l border-black"
        />
        <Party
          label="Other Consignee (Ship To)"
          lines={doc.ship_to}
          className="col-span-1 border-t border-black"
        />
        <Party
          label="Country of Origin of Goods"
          lines={[doc.origin]}
          className="col-span-2 border-l border-t border-black"
        />
      </div>

      <div className="grid grid-cols-3 border-x border-b border-black">
        {doc.shipment_fields.map((group, row) =>
          group.map((label, column) => (
            <Blank
              key={`${row}-${column}`}
              label={label}
              className={[
                column > 0 ? "border-l border-black" : "",
                row > 0 ? "border-t border-black" : "",
              ].join(" ")}
            />
          )),
        )}
      </div>

      <table className="mt-2 w-full border-collapse">
        <thead className="table-header-group">
          <tr>
            {doc.columns.map((column) => (
              <th
                key={column.label}
                className="border border-black bg-neutral-200 px-1 py-1 text-center align-middle font-semibold"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((line, index) => (
            <tr key={index} className="break-inside-avoid">
              {line.map((value, column) => (
                <Cell key={column} value={value} column={doc.columns[column]} />
              ))}
            </tr>
          ))}
          <tr className="break-inside-avoid bg-neutral-100">
            <td
              colSpan={QTY}
              className="border border-black px-1 py-1 text-right font-bold"
            >
              TOTAL
            </td>
            <Cell
              value={doc.total.quantity}
              column={doc.columns[QTY]}
              bold
            />
            <Cell
              value={doc.total.net_weight_kg}
              column={doc.columns[QTY + 1]}
              bold
            />
            <td className="border border-black" />
            <Cell
              value={doc.total.amount_usd}
              column={doc.columns[QTY + 3]}
              bold
            />
          </tr>
        </tbody>
      </table>

      <div className="mt-2 break-inside-avoid border border-black">
        <p className="border-b border-black px-1 py-1 font-bold">
          {doc.origin_line}
        </p>
        {doc.is_priced && (
          <div className="flex items-center justify-between gap-4 border-b border-black px-1 py-1 font-bold">
            <span>
              TOTAL CHARGEABLE AMOUNT IN US DOLLAR — {doc.amount_in_words}
            </span>
            <span className="tabular-nums">
              {doc.total.amount_usd?.toFixed(2)}
            </span>
          </div>
        )}
        <p className="border-b border-black px-1 py-1">{doc.note}</p>
        <div className="flex justify-between gap-8 px-1 py-1">
          <div>
            <p className="font-bold">Declaration:</p>
            {doc.declaration.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="text-right">
            <p className="font-bold">{doc.signatory}</p>
            <p className="mt-8">{doc.for_exporter}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function Party({
  label,
  lines,
  className,
}: {
  label: string;
  lines: string[];
  className?: string;
}) {
  return (
    <div className={`px-1 py-1 ${className ?? ""}`}>
      <p className="text-[7px] font-bold uppercase tracking-wide">{label}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

/** Ruled and labelled, left for the desk. */
function Blank({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`px-1 py-1 ${className ?? ""}`}>
      <p className="text-[7px] font-bold uppercase tracking-wide">{label}</p>
      <p className="h-4" />
    </div>
  );
}
