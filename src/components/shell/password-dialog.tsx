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
import { useChangePassword } from "@/lib/queries";
import { ApiError } from "@/lib/api";

export function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const change = useChangePassword();
  const toast = useToast();
  const failure = change.error instanceof ApiError ? change.error : null;

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Change password"
        description="This signs you out everywhere, here included. Sign in again with the new password."
        className="max-w-md"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (next !== repeat) {
              setMismatch(true);
              return;
            }
            // Success leaves for the login page; see useChangePassword.
            change.mutate(
              { current_password: current, new_password: next },
              {
                onError: (error) => {
                  const known =
                    error instanceof ApiError &&
                    (error.fieldError("current_password") ||
                      error.fieldError("new_password"));
                  if (!known) {
                    toast.error(
                      error instanceof ApiError
                        ? error.detail
                        : "Could not change the password",
                    );
                  }
                },
              },
            );
          }}
        >
          <DialogBody className="space-y-4">
            <Field
              label="Current password"
              htmlFor="current_password"
              error={failure?.fieldError("current_password")}
              required
            >
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                invalid={!!failure?.fieldError("current_password")}
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="new_password"
              error={failure?.fieldError("new_password")}
              required
            >
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                required
                invalid={!!failure?.fieldError("new_password")}
                value={next}
                onChange={(event) => {
                  setNext(event.target.value);
                  setMismatch(false);
                }}
              />
            </Field>
            <Field
              label="Repeat new password"
              htmlFor="repeat_password"
              error={mismatch ? "The two new passwords differ." : undefined}
              required
            >
              <Input
                id="repeat_password"
                type="password"
                autoComplete="new-password"
                required
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
            <Button
              type="submit"
              size="sm"
              disabled={change.isPending || change.isSuccess}
            >
              {change.isPending ? "Saving…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
