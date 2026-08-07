"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * React Query holds every piece of server data the app has fetched, and
 * handles loading states, errors and refetching for us. Without it we would
 * hand-write that logic on every screen.
 *
 * The client is created inside useState so each browser tab gets its own
 * cache and it survives re-renders without being recreated.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Master data (box types, categories, merchants) barely changes.
            // Don't refetch it every time the window regains focus.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
