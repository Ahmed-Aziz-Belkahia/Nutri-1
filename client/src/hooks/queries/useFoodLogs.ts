// Food Logs Query Hooks
// Reusable hooks for food log data fetching and mutations

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { queryKeys, queryPresets, createInvalidator } from '@/lib/queryUtils';
import { useToast } from '@/hooks/use-toast';

// Types
interface FoodLog {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
  loggedAt: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodLogsResponse {
  logs: FoodLog[];
  totals: DailyTotals;
}

// Query Hooks
export function useFoodLogsByDate(date: string): UseQueryResult<FoodLogsResponse> {
  return useQuery({
    queryKey: queryKeys.foodLogs.byDate(date),
    queryFn: async () => {
      const response = await fetch(`/api/food-logs?date=${date}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch food logs');
      return response.json();
    },
    ...queryPresets.dynamic,
  });
}

export function useDailyTotals(date: string): UseQueryResult<DailyTotals> {
  return useQuery({
    queryKey: queryKeys.foodLogs.totals(date),
    queryFn: async () => {
      const response = await fetch(`/api/food-logs?date=${date}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch totals');
      const data = await response.json();
      return data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    },
    ...queryPresets.dynamic,
    refetchInterval: 30000, // Poll every 30 seconds when page is focused
  });
}

export function useScannedMeals(): UseQueryResult<FoodLog[]> {
  return useQuery({
    queryKey: queryKeys.foodLogs.scanned(),
    queryFn: async () => {
      const response = await fetch('/api/food-logs/scanned?limit=100', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch scanned meals');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

export function useScannedMealsToday(): UseQueryResult<FoodLog[]> {
  return useQuery({
    queryKey: queryKeys.foodLogs.scannedToday(),
    queryFn: async () => {
      const response = await fetch('/api/food-logs/scanned?limit=10', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch today\'s scanned meals');
      const data = await response.json();
      
      // Filter for last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      return data.filter((log: FoodLog & { date: number }) => 
        new Date(log.date) > yesterday
      );
    },
    ...queryPresets.moderate,
  });
}

// Mutation Hooks
export function useAddFoodLog(date: string): UseMutationResult<any, Error, any> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (foodData: any) => {
      const response = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(foodData),
      });
      if (!response.ok) throw new Error('Failed to add food');
      return response.json();
    },
    onMutate: async (newFood) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.foodLogs.byDate(date),
      });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.foodLogs.byDate(date));
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.foodLogs.byDate(date), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          logs: [...(old.logs || []), { ...newFood, id: Date.now() }],
        };
      });
      
      return { previous };
    },
    onError: (err, newFood, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.foodLogs.byDate(date), context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to add food",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate related queries
      const invalidator = createInvalidator(queryClient);
      invalidator.foodLogs(date);
      toast({
        title: "Success",
        description: "Food added successfully",
      });
    },
  });
}

export function useDeleteFoodLog(date: string): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (logId: number) => {
      const response = await fetch(`/api/food-logs/${logId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete food log');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.foodLogs(date);
      toast({
        title: "Success",
        description: "Food removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove food",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateFoodLog(date: string): UseMutationResult<any, Error, { id: number; data: any }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/food-logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update food log');
      return response.json();
    },
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.foodLogs.byDate(date) });
      const previous = queryClient.getQueryData(queryKeys.foodLogs.byDate(date));
      
      queryClient.setQueryData(queryKeys.foodLogs.byDate(date), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          logs: old.logs.map((item: any) => 
            item.id === id ? { ...item, ...data } : item
          ),
        };
      });
      
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.foodLogs.byDate(date), context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to update food",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.foodLogs(date);
      toast({
        title: "Success",
        description: "Food updated",
      });
    },
  });
}
