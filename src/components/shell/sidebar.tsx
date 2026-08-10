"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Package,
  Store,
  Tags,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Hardgoods",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/orders", label: "Orders", icon: ClipboardList },
    ],
  },
  // Box designs are authored inside an order's packing screen — the only
  // place the remaining quantities are visible — so they get no nav entry.
  {
    title: "Display",
    items: [
      { href: "/display/products", label: "Products", icon: Sparkles },
      { href: "/display/orders", label: "Orders", icon: ClipboardList },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/categories", label: "Categories", icon: Tags },
      { href: "/merchants", label: "Merchants", icon: Store },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Boxes className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">DKC Packing</div>
          <div className="text-[10px] text-muted-foreground">Export operations</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLink
          href="/"
          label="Dashboard"
          icon={LayoutDashboard}
          active={pathname === "/"}
        />
        {GROUPS.map((group) => (
          <NavGroup key={group.title} title={group.title} pathname={pathname}>
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </NavGroup>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <a
          href="http://localhost:8000/admin/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Django Admin ↗
        </a>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  pathname,
  children,
}: {
  title: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  void pathname;

  return (
    <div className="pt-3">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown
          className={cn("size-3 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  disabled,
}: NavItem & { active?: boolean }) {
  if (disabled) {
    return (
      <span className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60">
        <Icon className="size-4" />
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary-subtle font-medium text-sidebar-primary"
          : "text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
