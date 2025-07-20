import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Enhanced caching for better performance and faster page transitions
      staleTime: 600000, // 10 minutes - data stays fresh for longer (doubled)
      gcTime: 3600000, // 1 hour - keep data in cache much longer for revisits
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnReconnect: true, // Refetch when reconnecting
      retry: 1, // Minimize retries
      retryDelay: 300, // Even faster retry (300ms instead of 500ms)
      networkMode: 'always',
      cacheTime: 1800000, // 30 minutes - explicit cache time setting
      suspense: false, // Don't use React Suspense
      useErrorBoundary: false, // Don't use React Error Boundary
      queryFn: async ({ queryKey }) => {
        try {
          // Add cache-control headers to help with caching
          const res = await fetch(queryKey[0] as string, {
            credentials: "include",
            headers: {
              "Cache-Control": "max-age=600", // 10 minutes browser cache
            }
          });

          if (!res.ok) {
            // For 404, return null instead of throwing
            if (res.status === 404) {
              return null;
            }
            // For server errors, throw with status
            if (res.status >= 500) {
              throw new Error(`${res.status}: ${res.statusText}`);
            }
            // For other errors, throw with response text
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
      retry: false,
      networkMode: 'always',
      onError: (err, variables, context) => {
        console.error("Mutation error:", err);
      }
    }
  },
});