"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
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
import type { User } from "@/types";

export function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const save = useSaveUser();
  const toast = useToast();
  const error =
    save.error instanceof ApiError ? save.error.fieldError("password") : undefined;

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Reset password"
        description={`A new password for ${user.full_name} (${user.username}).`}
        className="max-w-md"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (password !== repeat) {
              setMismatch(true);
              return;
            }
            save.mutate(
              { id: user.id, password },
              {
                onSuccess: () => {
                  toast.success(`Password reset for ${user.full_name}`);
                  onClose();
                },
                onError: (failure) => {
                  if (!(failure instanceof ApiError && failure.fieldError("password"))) {
                    toast.error(
                      failure instanceof ApiError
                        ? failure.summary
                        : "Could not reset the password",
                    );
                  }
                },
              },
            );
          }}
        >
          <DialogBody className="space-y-4">
            <Field label="New password" error={error} required>
              <Input
                type="password"
                autoFocus
                required
                autoComplete="new-password"
                invalid={!!error}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setMismatch(false);
                }}
              />
            </Field>
            <Field
              label="Repeat new password"
              error={mismatch ? "The two passwords differ." : undefined}
              required
            >
              <Input
                type="password"
                required
                autoComplete="new-password"
                invalid={mismatch}
                value={repeat}
                onChange={(event) => {
                  setRepeat(event.target.value);
                  setMismatch(false);
                }}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
