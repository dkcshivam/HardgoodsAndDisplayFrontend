"use client";

import { useEffect, useSyncExternalStore } from "react";
import { session } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { Button } from "@/components/ui/button";

// Storage is browser-only, so the server and the hydrating client both say
// "not known yet" and render nothing.
const notKnownYet = () => undefined;

/**
 * Renders nothing until the user is known, so somebody signed out never
 * glimpses the screen they are being sent away from.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const signedIn = useSyncExternalStore<boolean | undefined>(
    session.subscribe,
    session.active,
    notKnownYet,
  );
  const me = useMe({ enabled: signedIn === true });

  useEffect(() => {
    if (signedIn === false) {
      session.goToLogin(window.location.pathname + window.location.search);
    }
  }, [signedIn]);

  if (signedIn !== true) return null;
  if (me.data) return children;
  if (!me.isError) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-secondary-foreground">
        Could not reach the server.
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => me.refetch()}
        disabled={me.isFetching}
      >
        {me.isFetching ? "Trying…" : "Try again"}
      </Button>
    </div>
  );
}
