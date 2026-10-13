"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { UserMenu } from "@/components/shell/user-menu";

const LABELS: Record<string, string> = {
  products: "Products",
  categories: "Categories",
  merchants: "Merchants",
  stores: "Stores",
  users: "Users",
  orders: "Orders",
  packing: "Packing",
  new: "New",
};

// Stops on the trail with no page of their own — linked, they would 404. An
// order is reached through its packing or edit screen, never on its own.
const NOT_PAGES = [/^\/display$/, /^\/(display\/)?orders\/\d+$/];

/** Derives the trail from the URL, so a new route needs no registration. */
function useCrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    return {
      href,
      label: LABELS[segment] ?? (/^\d+$/.test(segment) ? `#${segment}` : segment),
      last: index === segments.length - 1,
      linked: !NOT_PAGES.some((pattern) => pattern.test(href)),
    };
  });
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
            ) : !crumb.linked ? (
              <span className="capitalize text-muted-foreground">{crumb.label}</span>
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
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}
