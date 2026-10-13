"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field, FieldRow } from "@/components/ui/field";
import {
  DialogRoot,
  DialogContent,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useSaveUser } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { Role, User, UserWrite } from "@/types";

export const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "senior_merchant", label: "Senior Merchant" },
  { value: "merchant", label: "Merchant" },
];

const FIELDS = [
  "username",
  "first_name",
  "last_name",
  "email",
  "role",
  "is_active",
] as const;

const BLANK: UserWrite = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "merchant",
  is_active: true,
  password: "",
};

function writable(user: User): UserWrite {
  return Object.fromEntries(FIELDS.map((key) => [key, user[key]])) as UserWrite;
}

/** `user` null creates one. A new user needs a password; an existing one is reset separately. */
export function UserDialog({
  user,
  self,
  onClose,
}: {
  user: User | null;
  self: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserWrite>(user ? writable(user) : BLANK);
  const set = (patch: Partial<UserWrite>) =>
    setForm((current) => ({ ...current, ...patch }));

  const save = useSaveUser();
  const toast = useToast();
  const failure = save.error instanceof ApiError ? save.error : null;
  const errorFor = (field: string) => failure?.fieldError(field);

  function submit() {
    let payload: Partial<UserWrite> & { id?: number } = form;
    if (user) {
      const changed = FIELDS.filter((key) => form[key] !== user[key]);
      if (changed.length === 0) return onClose();
      payload = {
        id: user.id,
        ...Object.fromEntries(changed.map((key) => [key, form[key]])),
      };
    }

    save.mutate(payload, {
      onSuccess: () => {
        toast.success(user ? "User updated" : "User created");
        onClose();
      },
      onError: (error) => {
        // Anything no field below can show — a guard's `detail`, say.
        const shown =
          error instanceof ApiError &&
          [...FIELDS, "password"].some((key) => error.fieldError(key));
        if (!shown) {
          toast.error(error instanceof ApiError ? error.summary : "Could not save");
        }
      },
    });
  }

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={user ? `Edit ${user.full_name}` : "New user"}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <DialogBody className="space-y-4">
            <FieldRow className="sm:grid-cols-2">
              <Field label="Username" error={errorFor("username")} required>
                <Input
                  required
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  invalid={!!errorFor("username")}
                  value={form.username}
                  onChange={(event) => set({ username: event.target.value })}
                />
              </Field>
              <Field label="Email" error={errorFor("email")}>
                <Input
                  type="email"
                  autoComplete="off"
                  invalid={!!errorFor("email")}
                  value={form.email}
                  onChange={(event) => set({ email: event.target.value })}
                />
              </Field>
            </FieldRow>

            <FieldRow className="sm:grid-cols-2">
              <Field label="First name" error={errorFor("first_name")}>
                <Input
                  invalid={!!errorFor("first_name")}
                  value={form.first_name}
                  onChange={(event) => set({ first_name: event.target.value })}
                />
              </Field>
              <Field label="Last name" error={errorFor("last_name")}>
                <Input
                  invalid={!!errorFor("last_name")}
                  value={form.last_name}
                  onChange={(event) => set({ last_name: event.target.value })}
                />
              </Field>
            </FieldRow>

            <FieldRow className="sm:grid-cols-2">
              <Field
                label="Role"
                error={errorFor("role")}
                hint={self ? "Another admin has to change your role." : undefined}
                required
              >
                <Select
                  disabled={self}
                  invalid={!!errorFor("role")}
                  value={form.role}
                  onChange={(event) => set({ role: event.target.value as Role })}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" error={errorFor("is_active")}>
                <Select
                  disabled={self}
                  invalid={!!errorFor("is_active")}
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(event) =>
                    set({ is_active: event.target.value === "active" })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </FieldRow>

            {!user && (
              <Field
                label="Password"
                error={errorFor("password")}
                hint="They can change it once signed in."
                required
              >
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  invalid={!!errorFor("password")}
                  value={form.password ?? ""}
                  onChange={(event) => set({ password: event.target.value })}
                />
              </Field>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
