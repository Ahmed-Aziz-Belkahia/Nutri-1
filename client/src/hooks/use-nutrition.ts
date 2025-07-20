import { useQuery } from "@tanstack/react-query";

interface NutritionSummary {
  calories: {
    current: number;
    goal: number;
  };
  protein: {
    current: number;
    goal: number;
  };
  carbs: {
    current: number;
    goal: number;
  };
  fat: {
    current: number;
    goal: number;
  };
}

export function useNutrition() {
  return useQuery<NutritionSummary>({
    queryKey: ['nutrition-summary'],
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Refetch every minute
    queryFn: async () => {
      const response = await fetch('/api/nutrition/summary', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch nutrition data');
      }

      return response.json();
    }
  });
}