import { useQuery } from "@tanstack/react-query";

interface MealPlanProgress {
  inProgress: boolean;
  step?: string;
  currentDay?: number;
  totalDays?: number;
  message?: string;
  timestamp?: number;
}

export function useMealPlanProgress(enabled: boolean = false) {
  return useQuery<MealPlanProgress>({
    queryKey: ['/api/meal-plans/progress'],
    queryFn: async () => {
      const res = await fetch('/api/meal-plans/progress', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch progress');
      return res.json();
    },
    // Poll every 500ms while generation is in progress
    refetchInterval: enabled ? 500 : false,
    refetchOnMount: "always", // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window/tab regains focus
    staleTime: 0, // Always consider data stale
    enabled
  });
}
