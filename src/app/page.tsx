import { cbm, grossWeight, netWeight, format } from "@/lib/calc";

/**
 * Temporary landing page. It exists to prove the setup works — fonts,
 * design tokens and the domain maths — and will be replaced by the
 * Dashboard once the app shell is built.
 */
export default function Home() {
  // The worked example from the design brief: a teak serving tray.
  const productWeight = 0.6;
  const boxWeight = 0.2;
  const packingWeight = 0.1;
  const box = { l: 38, w: 28, h: 5 };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 p-8">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">
          Setup complete
        </div>
        <h1 className="mt-1 text-2xl font-semibold">DKC Packing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Frontend initialised. Next up: the app shell and Box Types.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Weight chain — worked example</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Three numbers a person types, two the app works out.
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Product weight" value={format.weight(productWeight)} />
          <Row
            label="Packing material weight"
            value={format.weight(packingWeight)}
          />
          <Row label="Box weight" value={format.weight(boxWeight)} />

          <div className="mt-4! border-t border-border-subtle pt-3">
            <Row
              label="Net weight"
              value={format.weight(netWeight(productWeight, packingWeight))}
              derived
            />
            <Row
              label="Gross weight"
              value={format.weight(
                grossWeight(productWeight, packingWeight, boxWeight),
              )}
              derived
            />
            <Row
              label={`CBM (${format.dimensions(box.l, box.w, box.h)} in)`}
              value={format.cbm(cbm(box.l, box.w, box.h))}
              derived
            />
          </div>
        </dl>
      </section>
    </main>
  );
}

function Row({
  label,
  value,
  derived = false,
}: {
  label: string;
  value: string;
  derived?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className={derived ? "text-primary" : "text-secondary-foreground"}>
        {label}
        {derived && (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            auto
          </span>
        )}
      </dt>
      <dd
        className={`tabular text-sm ${derived ? "font-semibold text-primary" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
