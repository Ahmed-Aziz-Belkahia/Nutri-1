// Meal Plan Query Hooks
// Reusable hooks for meal plan data fetching and mutations

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { queryKeys, queryPresets, createInvalidator } from '@/lib/queryUtils';
import { useToast } from '@/hooks/use-toast';

// Types
interface Meal {
  id: number;
  name: string;
  recipeId?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  isCompleted: boolean;
  imageUrl?: string;
}

interface MealPlan {
  id: number;
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: string;
}

interface MealPlanFilters {
  startDate?: string;
  endDate?: string;
}

// Query Hooks

// Get all meal plans (with optional date range)
export function useAllMealPlans(filters?: MealPlanFilters): UseQueryResult<MealPlan[]> {
  return useQuery({
    queryKey: filters?.startDate && filters?.endDate
      ? queryKeys.mealPlans.byDateRange(filters.startDate, filters.endDate)
      : queryKeys.mealPlans.all(),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      
      const response = await fetch(`/api/meal-plans?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch meal plans');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Get today's meal plan with polling for live updates
export function useTodaysMealPlan(): UseQueryResult<MealPlan | null> {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: queryKeys.mealPlans.today(),
    queryFn: async () => {
      const response = await fetch(`/api/meal-plans/today`, {
        credentials: 'include'
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch today\'s meal plan');
      return response.json();
    },
    ...queryPresets.dynamic,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

// Get meal plan by date
export function useMealPlanByDate(date: string): UseQueryResult<MealPlan | null> {
  return useQuery({
    queryKey: queryKeys.mealPlans.byDate(date),
    queryFn: async () => {
      const response = await fetch(`/api/meal-plans?date=${date}`, {
        credentials: 'include'
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch meal plan');
      const data = await response.json();
      return data[0] || null;
    },
    ...queryPresets.dynamic,
  });
}

// Get a specific meal plan by ID
export function useMealPlanById(id: number | undefined): UseQueryResult<MealPlan> {
  return useQuery({
    queryKey: queryKeys.mealPlans.byId(id!),
    queryFn: async () => {
      if (!id) throw new Error('Meal plan ID is required');
      
      const response = await fetch(`/api/meal-plans/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch meal plan');
      return response.json();
    },
    enabled: !!id,
    ...queryPresets.moderate,
  });
}

// Mutation Hooks

// Create a new meal plan
export function useCreateMealPlan(): UseMutationResult<MealPlan, Error, Omit<MealPlan, 'id' | 'createdAt'>> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (mealPlanData) => {
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(mealPlanData),
      });
      if (!response.ok) throw new Error('Failed to create meal plan');
      return response.json();
    },
    onSuccess: (data) => {
      const invalidator = createInvalidator(queryClient);
      invalidator.mealPlans(data.date, data.id);
      toast({
        title: "Success",
        description: "Meal plan created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create meal plan",
        variant: "destructive",
      });
    },
  });
}

// Update a meal plan
export function useUpdateMealPlan(): UseMutationResult<MealPlan, Error, { id: number; data: Partial<MealPlan> }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/meal-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update meal plan');
      return response.json();
    },
    onSuccess: (data) => {
      const invalidator = createInvalidator(queryClient);
      invalidator.mealPlans(data.date, data.id);
      toast({
        title: "Success",
        description: "Meal plan updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update meal plan",
        variant: "destructive",
      });
    },
  });
}

// Delete a meal plan
export function useDeleteMealPlan(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (mealPlanId) => {
      const response = await fetch(`/api/meal-plans/${mealPlanId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete meal plan');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.mealPlans();
      toast({
        title: "Success",
        description: "Meal plan deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete meal plan",
        variant: "destructive",
      });
    },
  });
}

// Complete a meal (mark as eaten)
export function useCompleteMeal(): UseMutationResult<Meal, Error, { mealPlanId: number; mealId: number; date: string }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ mealPlanId, mealId }) => {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/meals/${mealId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to complete meal');
      return response.json();
    },
    onMutate: async ({ mealPlanId, mealId, date }) => {
      // Optimistic update
      const todayKey = queryKeys.mealPlans.today();
      const dateKey = queryKeys.mealPlans.byDate(date);
      
      await queryClient.cancelQueries({ queryKey: todayKey });
      await queryClient.cancelQueries({ queryKey: dateKey });
      
      const previousToday = queryClient.getQueryData(todayKey);
      const previousDate = queryClient.getQueryData(dateKey);
      
      // Update both today and date-specific queries
      const updateMeal = (mealPlan: any) => {
        if (!mealPlan || mealPlan.id !== mealPlanId) return mealPlan;
        return {
          ...mealPlan,
          meals: mealPlan.meals.map((m: Meal) =>
            m.id === mealId ? { ...m, isCompleted: true } : m
          ),
        };
      };
      
      queryClient.setQueryData(todayKey, updateMeal);
      queryClient.setQueryData(dateKey, updateMeal);
      
      return { previousToday, previousDate, todayKey, dateKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context) {
        if (context.previousToday) {
          queryClient.setQueryData(context.todayKey, context.previousToday);
        }
        if (context.previousDate) {
          queryClient.setQueryData(context.dateKey, context.previousDate);
        }
      }
      toast({
        title: "Error",
        description: "Failed to mark meal as complete",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      const invalidator = createInvalidator(queryClient);
      invalidator.mealPlans(variables.date, variables.mealPlanId);
      toast({
        title: "Success",
        description: "Meal marked as complete",
      });
    },
  });
}

// Uncomplete a meal (mark as not eaten)
export function useUncompleteMeal(): UseMutationResult<Meal, Error, { mealPlanId: number; mealId: number; date: string }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ mealPlanId, mealId }) => {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/meals/${mealId}/uncomplete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to uncomplete meal');
      return response.json();
    },
    onMutate: async ({ mealPlanId, mealId, date }) => {
      // Optimistic update
      const todayKey = queryKeys.mealPlans.today();
      const dateKey = queryKeys.mealPlans.byDate(date);
      
      await queryClient.cancelQueries({ queryKey: todayKey });
      await queryClient.cancelQueries({ queryKey: dateKey });
      
      const previousToday = queryClient.getQueryData(todayKey);
      const previousDate = queryClient.getQueryData(dateKey);
      
      const updateMeal = (mealPlan: any) => {
        if (!mealPlan || mealPlan.id !== mealPlanId) return mealPlan;
        return {
          ...mealPlan,
          meals: mealPlan.meals.map((m: Meal) =>
            m.id === mealId ? { ...m, isCompleted: false } : m
          ),
        };
      };
      
      queryClient.setQueryData(todayKey, updateMeal);
      queryClient.setQueryData(dateKey, updateMeal);
      
      return { previousToday, previousDate, todayKey, dateKey };
    },
    onError: (err, variables, context) => {
      if (context) {
        if (context.previousToday) {
          queryClient.setQueryData(context.todayKey, context.previousToday);
        }
        if (context.previousDate) {
          queryClient.setQueryData(context.dateKey, context.previousDate);
        }
      }
      toast({
        title: "Error",
        description: "Failed to unmark meal",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      const invalidator = createInvalidator(queryClient);
      invalidator.mealPlans(variables.date, variables.mealPlanId);
      toast({
        title: "Success",
        description: "Meal unmarked",
      });
    },
  });
}
