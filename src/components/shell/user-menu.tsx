"use client";

import { useState } from "react";
import { DropdownMenu as Menu } from "radix-ui";
import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { PasswordDialog } from "@/components/shell/password-dialog";
import { useLogout, useMe } from "@/lib/queries";
import type { User } from "@/types";

function initials(user: User): string {
  const named = [user.first_name, user.last_name]
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join("");
  return (named || user.username.slice(0, 2)).toUpperCase();
}

const ITEM =
  "flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function UserMenu() {
  const { data: me } = useMe();
  const logout = useLogout();
  const [changing, setChanging] = useState(false);

  if (!me) return null;

  return (
    <>
      {/* Not modal: a modal menu handing focus to a dialog can leave the page unclickable. */}
      <Menu.Root modal={false}>
        <Menu.Trigger className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-subtle text-[11px] font-semibold text-primary">
            {initials(me)}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium">{me.full_name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {me.role_label}
            </span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-52 rounded-md border border-border bg-card p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0"
          >
            <Menu.Label className="px-2 py-1.5 text-xs text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{me.username}</span>
            </Menu.Label>
            <Menu.Separator className="my-1 h-px bg-border-subtle" />
            <Menu.Item className={ITEM} onSelect={() => setChanging(true)}>
              <KeyRound /> Change password
            </Menu.Item>
            <Menu.Item
              className={ITEM}
              disabled={logout.isPending}
              onSelect={() => logout.mutate()}
            >
              <LogOut /> {logout.isPending ? "Logging out…" : "Log out"}
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      {changing && <PasswordDialog onClose={() => setChanging(false)} />}
    </>
  );
}
