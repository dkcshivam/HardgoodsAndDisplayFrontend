import type { Blocker, Carton, OrderLine, Product, Reconciliation } from "@/types";

export interface CartonDraft extends Omit<Carton, "id" | "net_weight_kg" | "cbm"> {
  id?: number;
}

/**
 * Live mirrors of the backend's reconcile() and find_blockers(), so the
 * packer sees a problem while typing. The backend re-runs both on save and
 * has the final say (ARCHITECTURE.md D5).
 */

export function reconcile(
  lines: OrderLine[],
  cartons: CartonDraft[],
  products: Map<number, Product>,
): Reconciliation[] {
  const whole = new Map<number, number>();
  const byPart = new Map<number, Map<number, number>>();

  for (const carton of cartons) {
    for (const content of carton.contents) {
      if (content.part == null) {
        whole.set(content.product, (whole.get(content.product) ?? 0) + content.quantity);
      } else {
        const parts = byPart.get(content.product) ?? new Map<number, number>();
        parts.set(content.part, (parts.get(content.part) ?? 0) + content.quantity);
        byPart.set(content.product, parts);
      }
    }
  }

  return lines.map((line) => {
    const product = products.get(line.product);
    let packed: number;

    if (product?.is_multi_part) {
      const counts = byPart.get(line.product);
      // A unit is packed only once every part has a carton, so take the lowest.
      packed = product.parts.length
        ? Math.min(...product.parts.map((part) => counts?.get(part.id) ?? 0))
        : 0;
    } else {
      packed = whole.get(line.product) ?? 0;
    }

    return {
      product: line.product,
      style_no: line.product_style_no,
      ordered: line.quantity,
      packed,
      is_matched: packed === line.quantity,
    };
  });
}

export function findBlockers(
  cartons: CartonDraft[],
  reconciliation: Reconciliation[],
): Blocker[] {
  const blockers: Blocker[] = [];
  const seen = new Map<string, number>();

  cartons.forEach((carton, index) => {
    const number = (carton.carton_no ?? "").trim();
    const label = number || `row ${index + 1}`;

    if (!number) {
      blockers.push({
        code: "missing_carton_no",
        message: `Row ${index + 1} is missing a carton number`,
        carton_id: carton.id ?? null,
      });
    } else {
      seen.set(number, (seen.get(number) ?? 0) + 1);
    }

    // Dimensions drive CBM, which is what the shipping line bills against.
    const missing = (
      [
        ["length", carton.length_in],
        ["width", carton.width_in],
        ["height", carton.height_in],
      ] as const
    )
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      const named =
        missing.length === 1
          ? missing[0]
          : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
      blockers.push({
        code: "missing_dimensions",
        message: `Carton ${label} is missing its ${named}`,
        carton_id: carton.id ?? null,
      });
    }

    const net = carton.contents.reduce(
      (sum, content) => sum + (content.net_weight_kg ?? 0),
      0,
    );
    if ((carton.gross_weight_kg ?? 0) < net) {
      blockers.push({
        code: "gross_below_net",
        message: `Carton ${label}: gross weight ${carton.gross_weight_kg ?? 0} kg is below net weight ${net.toFixed(3)} kg`,
        carton_id: carton.id ?? null,
      });
    }
  });

  for (const [number, count] of seen) {
    if (count > 1) {
      blockers.push({
        code: "duplicate_carton_no",
        message: `Carton number “${number}” is used ${count} times`,
        carton_id: null,
      });
    }
  }

  for (const row of reconciliation) {
    if (!row.is_matched) {
      blockers.push({
        code: "quantity_mismatch",
        message: `${row.style_no}: packed ${row.packed} of ${row.ordered} ordered`,
        carton_id: null,
      });
    }
  }

  return blockers;
}

export function cartonNetWeight(carton: CartonDraft): number {
  return carton.contents.reduce(
    (sum, content) => sum + (content.net_weight_kg ?? 0),
    0,
  );
}

export function nextCartonNo(cartons: CartonDraft[]): string {
  const highest = cartons.reduce((max, carton) => {
    const match = /^CTN-(\d+)$/.exec((carton.carton_no ?? "").trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `CTN-${String(highest + 1).padStart(3, "0")}`;
}
