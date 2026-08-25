"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/lib/trpc";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

// One instance per browser tab, reused across re-renders and client-side
// route changes. On the server this is bypassed entirely -- see
// getQueryClient below -- so it never leaks one visitor's cached data into
// another visitor's response.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: a fresh client per request. Module-level state on the server
    // is process-wide, not request-scoped, so caching it here the way we
    // do in the browser would mean two concurrent requests see each
    // other's query cache.
    return makeQueryClient();
  }
  // Browser: build it once, lazily, and keep reusing it. Not created at
  // module scope (`const browserQueryClient = makeQueryClient()`) because
  // this module can be evaluated on the server too (RSC bundling); creating
  // the QueryClient eagerly at import time would construct one on the
  // server as well, for no reason.
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  // Lazy useState initializer: getQueryClient() runs once, on mount, not on
  // every render. Constructing a QueryClient isn't free, and calling
  // getQueryClient() directly in the component body (not inside useState)
  // would re-run it every render for no reason, even though the browser
  // branch would just hand back the same singleton anyway.
  const [queryClient] = useState(getQueryClient);
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: "/api/trpc" })],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
