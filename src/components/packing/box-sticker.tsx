import { ImageOff } from "lucide-react";
import type { StickerPage } from "@/lib/stickers";

/**
 * The label stuck on the box, drawn as it prints. Black rules and plain type
 * on purpose — it is read on a loading dock, photocopied, and signed in pen.
 */
export function BoxSticker({
  page,
  photos,
}: {
  page: StickerPage;
  photos: boolean;
}) {
  const { sticker, rows, pages } = page;
  const cell = "border-[1.5px] border-black align-middle";

  return (
    <article className="sheet mx-auto w-full max-w-[190mm] bg-white p-6 text-black ring-1 ring-border print:max-w-none print:p-0 print:ring-0">
      <table className="w-full table-fixed border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} w-1/4 p-2 text-sm font-bold uppercase tracking-wide`}>
              Box Number
            </td>
            <td className={`${cell} tabular w-1/4 p-2 text-center text-2xl font-bold`}>
              {sticker.box_no}
              {pages > 1 && (
                <span className="block font-sans text-[10px] font-medium uppercase tracking-widest">
                  sheet {page.page} of {pages}
                </span>
              )}
            </td>
            <td className={`${cell} w-1/4 p-2 text-sm font-bold uppercase tracking-wide`}>
              {sticker.scope_label}
            </td>
            <td className={`${cell} tabular w-1/4 p-2 text-center text-xl font-bold`}>
              {sticker.scope_value || "—"}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="-mt-px w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[24%]" />
          <col className={photos ? "w-[30%]" : "w-[59%]"} />
          {photos && <col className="w-[29%]" />}
          <col className="w-[17%]" />
        </colgroup>
        <thead>
          <tr>
            <th className={`${cell} p-2 text-xs font-bold uppercase tracking-wider`}>
              Style Number
            </th>
            <th className={`${cell} p-2 text-xs font-bold uppercase tracking-wider`}>
              Style Name
            </th>
            {photos && (
              <th className={`${cell} p-2 text-xs font-bold uppercase tracking-wider`}>
                Picture
              </th>
            )}
            <th className={`${cell} p-2 text-xs font-bold uppercase tracking-wider`}>
              Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                className={`${cell} p-6 text-center text-sm italic`}
                colSpan={photos ? 4 : 3}
              >
                Empty box
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.key}>
              <td className={`${cell} tabular p-2 text-sm font-semibold`}>
                {row.style_no}
              </td>
              <td className={`${cell} p-2 text-center text-xs leading-snug`}>
                {row.style_name || "—"}
                {row.part_name && (
                  <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider">
                    {row.part_name}
                  </span>
                )}
              </td>
              {photos && (
                <td className={`${cell} h-20 p-1 text-center`}>
                  {row.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={row.image}
                      alt=""
                      className="mx-auto max-h-[70px] max-w-full object-contain"
                    />
                  ) : (
                    <ImageOff className="mx-auto size-4 text-neutral-400" />
                  )}
                </td>
              )}
              <td className={`${cell} tabular p-2 text-center text-lg font-bold`}>
                {row.quantity}
                <span className="block font-sans text-[9px] font-medium uppercase tracking-widest text-neutral-600">
                  {row.unit}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-between text-[10px] font-medium uppercase tracking-widest text-neutral-600">
        <span>Signature by Pinto</span>
        <span>Signature by HOD</span>
      </div>
    </article>
  );
}
