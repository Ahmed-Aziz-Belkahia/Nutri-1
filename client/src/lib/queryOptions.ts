// Cache Strategy Presets for React Query
// Defines cache tiers and refetch strategies

import type { UseQueryOptions } from '@tanstack/react-query';

// Cache duration constants (in milliseconds)
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const cacheTimes = {
  static: {
    staleTime: 30 * MINUTE,
    gcTime: 1 * HOUR,
  },
  moderate: {
    staleTime: 5 * MINUTE,
    gcTime: 30 * MINUTE,
  },
  dynamic: {
    staleTime: 1 * MINUTE,
    gcTime: 10 * MINUTE,
  },
  realtime: {
    staleTime: 0,
    gcTime: 5 * MINUTE,
  },
  noCache: {
    staleTime: 0,
    gcTime: 0,
  },
} as const;

// Query option presets
export const queryPresets = {
  // For user profile, settings, preferences (rarely changes)
  static: {
    ...cacheTimes.static,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  } satisfies Partial<UseQueryOptions>,
  
  // For recipes, past meal plans, completed logs
  moderate: {
    ...cacheTimes.moderate,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  } satisfies Partial<UseQueryOptions>,
  
  // For today's data, active shopping lists
  dynamic: {
    ...cacheTimes.dynamic,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } satisfies Partial<UseQueryOptions>,
  
  // For live cooking, active scanning
  realtime: {
    ...cacheTimes.realtime,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } satisfies Partial<UseQueryOptions>,
  
  // For polling scenarios
  polling: (intervalMs: number) => ({
    ...cacheTimes.dynamic,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
  }) satisfies Partial<UseQueryOptions>,
} as const;

// Helper to combine presets with custom options
export function withOptions<T = unknown>(
  preset: Partial<UseQueryOptions>,
  overrides?: Partial<UseQueryOptions<T>>
): Partial<UseQueryOptions<T>> {
  return { ...preset, ...overrides } as Partial<UseQueryOptions<T>>;
}
