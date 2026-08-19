"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  products: "Products",
  categories: "Categories",
  merchants: "Merchants",
  stores: "Stores",
  orders: "Orders",
  packing: "Packing",
  new: "New",
};

/** Derives the trail from the URL, so a new route needs no registration. */
function useCrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => ({
    href: "/" + segments.slice(0, index + 1).join("/"),
    label: LABELS[segment] ?? (/^\d+$/.test(segment) ? `#${segment}` : segment),
    last: index === segments.length - 1,
  }));
}

export function Topbar() {
  const crumbs = useCrumbs();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-5">
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
            )}
            {crumb.last ? (
              <span className="font-medium capitalize">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="capitalize text-muted-foreground hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </header>
  );
}
