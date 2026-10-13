"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Boxes, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { useLogin } from "@/lib/queries";
import { ApiError } from "@/lib/api";

/** `next` arrives in the URL, so only a path on this site is followed. */
function safeNext(value: string | null): string {
  return value && /^\/(?![/\\])/.test(value) ? value : "/";
}

function reason(error: Error): string {
  if (!(error instanceof ApiError)) {
    return "Could not reach the server. Check the connection and try again.";
  }
  if (error.status === 429) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (error.status === 401) {
    return error.fieldError("detail") ?? "Wrong username or password.";
  }
  return error.detail;
}

const NOTICES: Record<string, string> = {
  password: "Password changed. Sign in with the new one.",
};

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const notice = NOTICES[params.get("reason") ?? ""];

  return (
    <form
      className="space-y-4 px-6 py-5"
      onSubmit={(event) => {
        event.preventDefault();
        login.mutate(
          { username: username.trim(), password },
          { onSuccess: () => router.replace(safeNext(params.get("next"))) },
        );
      }}
    >
      {login.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive-border bg-destructive-subtle px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          <span className="leading-snug">{reason(login.error)}</span>
        </div>
      ) : notice ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md bg-success-subtle px-3 py-2 text-xs text-success"
        >
          <CheckCircle2 className="mt-px size-3.5 shrink-0" />
          <span className="leading-snug">{notice}</span>
        </div>
      ) : null}

      <Field label="Username" htmlFor="username">
        <Input
          id="username"
          autoFocus
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold">DKC Packing</div>
            <div className="text-xs text-muted-foreground">Export operations</div>
          </div>
        </div>

        <Card>
          <div className="border-b border-border-subtle px-6 py-4">
            <h1 className="text-sm font-semibold">Sign in</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Use the account an admin set up for you.
            </p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
