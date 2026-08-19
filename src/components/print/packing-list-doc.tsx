import { Fragment } from "react";
import { Cell } from "@/components/print/document-cell";
import type { DocColumn, DocValue, PackingListDocument } from "@/types";

/**
 * The packing list on paper. Every label, figure and decimal place arrives
 * in the payload from the same builder that writes the .xlsx, so this page
 * and the sheet cannot say different things.
 */
export function PackingListDoc({ doc }: { doc: PackingListDocument }) {
  return (
    <article className="w-[277mm] bg-white p-6 text-black shadow-sm print:w-full print:p-0 print:shadow-none">
      <h1 className="text-base font-bold tracking-[0.1em]">{doc.title}</h1>
      <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-0.5 text-[10px]">
        {doc.facts.map((fact) => (
          <div key={fact.label}>
            <dt className="inline font-semibold">{fact.label}:</dt>{" "}
            <dd className="inline">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <table className="mt-3 w-full border-collapse text-[9px] leading-tight">
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
          {doc.blocks.map((block, index) => (
            <Fragment key={index}>
              {block.banner && (
                <tr className="break-inside-avoid">
                  <td
                    colSpan={doc.columns.length}
                    className="border border-black bg-neutral-100 px-1 py-1 font-semibold"
                  >
                    {block.banner}
                  </td>
                </tr>
              )}
              {block.rows.map((row, position) => (
                <tr key={position} className="break-inside-avoid">
                  {row.values.map((value, column) => (
                    <Cell
                      key={column}
                      value={value}
                      column={doc.columns[column]}
                      // The rule that opens a box is heavier than the ones
                      // between its own styles, exactly as in the sheet.
                      className={row.opens ? "border-t-2" : undefined}
                    />
                  ))}
                </tr>
              ))}
              {block.subtotal && (
                <TotalRow
                  label={block.subtotal_label}
                  values={block.subtotal}
                  columns={doc.columns}
                />
              )}
            </Fragment>
          ))}
          {doc.total && (
            <TotalRow
              label={doc.total_label}
              values={doc.total}
              columns={doc.columns}
              heavy
            />
          )}
        </tbody>
      </table>
    </article>
  );
}

function TotalRow({
  label,
  values,
  columns,
  heavy,
}: {
  label: string;
  values: DocValue[];
  columns: DocColumn[];
  heavy?: boolean;
}) {
  // The label runs up to the first column that carries a figure.
  const first = values.findIndex((value) => value !== null);
  const span = Math.max(first === -1 ? columns.length : first, 1);

  return (
    <tr className={heavy ? "break-inside-avoid bg-neutral-200" : "break-inside-avoid bg-neutral-100"}>
      <td
        colSpan={span}
        className="border border-black border-t-2 px-1 py-1 text-right font-bold"
      >
        {label}
      </td>
      {values.slice(span).map((value, index) => (
        <Cell
          key={index}
          value={value}
          column={columns[span + index]}
          bold
          className="border-t-2"
        />
      ))}
    </tr>
  );
}
