import { QueryClient, QueryFunctionContext } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // New defaults - more aggressive refetching for data freshness
      staleTime: 5 * 60 * 1000,        // 5 minutes default (reduced from 10)
      gcTime: 30 * 60 * 1000,          // 30 minutes (reduced from 1 hour)
      refetchOnMount: true,            // Always check if stale on mount
      refetchOnWindowFocus: true,      // Refetch when tab gains focus (changed from false)
      refetchOnReconnect: true,        // Refetch when reconnecting
      retry: 2,                        // Retry failed queries twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'always',
      queryFn: async (ctx: QueryFunctionContext) => {
        try {
          const endpoint = String((ctx.queryKey as readonly unknown[])[0] ?? '');
          const res = await fetch(endpoint, {
            credentials: "include",
            headers: {
              "Cache-Control": "max-age=300", // 5 minutes browser cache
            }
          });

          if (!res.ok) {
            if (res.status === 404) {
              return null;
            }
            if (res.status >= 500) {
              throw new Error(`${res.status}: ${res.statusText}`);
            }
            throw new Error(`${res.status}: ${await res.text()}`);
          }

          return res.json();
        } catch (error) {
          console.error("Query error:", error);
          throw error;
        }
      },
    },
    mutations: {
      retry: 1,                        // Retry failed mutations once
      retryDelay: 1000,                // Wait 1 second before retry
      networkMode: 'always',
      onError: (err) => {
        console.error("Mutation error:", err);
      }
    }
  },
});