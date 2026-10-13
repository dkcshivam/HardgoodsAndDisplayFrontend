"use client";

import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { NoAccess } from "@/components/shell/no-access";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Pager } from "@/components/ui/pager";
import { Table, THead, TH, TR, TD, EmptyRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ROLES, UserDialog } from "@/components/users/user-dialog";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { useIsAdmin, useMe, useSaveUser, useUsers } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { format } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export default function UsersPage() {
  const isAdmin = useIsAdmin();
  const { data: me } = useMe();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [toggling, setToggling] = useState<User | null>(null);

  const { data, isLoading, isError, error } = useUsers(
    { search, role, is_active: active, ordering: "username", page },
    { enabled: isAdmin, placeholderData: keepPreviousData },
  );
  const rows = data?.results ?? [];
  const filtered = Boolean(search || role || active);

  const save = useSaveUser();
  const toast = useToast();

  // Any filter change starts again from the first page.
  const filter = (apply: (value: string) => void) => (value: string) => {
    apply(value);
    setPage(1);
  };

  if (!isAdmin || (error instanceof ApiError && error.status === 403)) {
    return <NoAccess />;
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <PageHeader
          title="Users"
          description="Who can sign in, and as what. Users are deactivated, never deleted."
          actions={
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus /> New user
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={filter(setSearch)}
            placeholder="Search name, username or email…"
          />
          <Select
            className="w-44"
            value={role}
            onChange={(event) => filter(setRole)(event.target.value)}
          >
            <option value="">All roles</option>
            {ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={active}
            onChange={(event) => filter(setActive)(event.target.value)}
          >
            <option value="">Any status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>

        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Username</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Last login</TH>
                <TH />
              </tr>
            </THead>
            <tbody>
              {isLoading && <EmptyRow colSpan={7}>Loading…</EmptyRow>}
              {isError && (
                <EmptyRow colSpan={7}>
                  <span className="text-destructive">Could not load users.</span>
                </EmptyRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <EmptyRow colSpan={7}>
                  {filtered ? "No users match." : "No users yet."}
                </EmptyRow>
              )}
              {rows.map((row) => {
                const self = row.id === me?.id;
                return (
                  <TR
                    key={row.id}
                    className={cn(!row.is_active && "text-muted-foreground")}
                  >
                    <TD className="font-medium">
                      {row.full_name}
                      {self && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TD>
                    <TD className="tabular text-secondary-foreground">
                      {row.username}
                    </TD>
                    <TD className="text-secondary-foreground">
                      {row.email || "—"}
                    </TD>
                    <TD>
                      <Badge tone={row.role === "admin" ? "info" : "neutral"}>
                        {row.role_label}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={row.is_active ? "success" : "neutral"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {row.last_login ? format.dateTime(row.last_login) : "Never"}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          aria-label={`Edit ${row.full_name}`}
                          onClick={() => setEditing(row)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          aria-label={`Reset the password of ${row.full_name}`}
                          onClick={() => setResetting(row)}
                        >
                          <KeyRound />
                        </Button>
                        {self ? (
                          // Keeps the column aligned; nobody deactivates themselves.
                          <span className="size-9" />
                        ) : row.is_active ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Deactivate"
                            aria-label={`Deactivate ${row.full_name}`}
                            className="text-destructive hover:bg-destructive-subtle"
                            onClick={() => setToggling(row)}
                          >
                            <UserX />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reactivate"
                            aria-label={`Reactivate ${row.full_name}`}
                            onClick={() => setToggling(row)}
                          >
                            <UserCheck />
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
          <Pager page={page} data={data} onChange={setPage} />
        </Card>
      </div>

      {editing && (
        <UserDialog
          user={editing === "new" ? null : editing}
          self={editing !== "new" && editing.id === me?.id}
          onClose={() => setEditing(null)}
        />
      )}

      {resetting && (
        <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      )}

      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.is_active ? "Deactivate user" : "Reactivate user"}
        message={
          toggling?.is_active
            ? `Deactivate ${toggling.full_name}? They lose access straight away and cannot sign in until reactivated. Their history stays.`
            : `Reactivate ${toggling?.full_name}? They can sign in again with their existing password.`
        }
        confirmLabel={toggling?.is_active ? "Deactivate" : "Reactivate"}
        destructive={toggling?.is_active ?? true}
        busy={save.isPending}
        onConfirm={() =>
          toggling &&
          save.mutate(
            { id: toggling.id, is_active: !toggling.is_active },
            {
              onSuccess: () => {
                toast.success(
                  `${toggling.full_name} ${toggling.is_active ? "deactivated" : "reactivated"}`,
                );
                setToggling(null);
              },
              onError: (failure) =>
                toast.error(
                  failure instanceof ApiError ? failure.summary : "Could not save",
                ),
            },
          )
        }
      />
    </main>
  );
}
