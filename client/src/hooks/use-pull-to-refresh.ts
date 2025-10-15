import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Hook to create a pull-to-refresh handler that invalidates React Query cache
 * @param queryKeys - Array of query keys to invalidate on refresh
 * @param onRefresh - Optional additional refresh logic
 */
export function usePullToRefresh(queryKeys: string[] | string[][], onRefresh?: () => Promise<void>) {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    // Run custom refresh logic if provided
    if (onRefresh) {
      await onRefresh();
    }

    // Invalidate all specified query keys
    await Promise.all(
      queryKeys.map(key => 
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
      )
    );

    // Small delay to ensure smooth animation
    await new Promise(resolve => setTimeout(resolve, 300));
  }, [queryClient, queryKeys, onRefresh]);

  return handleRefresh;
}
