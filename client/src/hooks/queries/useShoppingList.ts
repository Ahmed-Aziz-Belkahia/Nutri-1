// Shopping List Query Hooks
// Reusable hooks for shopping list data fetching and mutations

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { queryKeys, queryPresets, createInvalidator } from '@/lib/queryUtils';
import { useToast } from '@/hooks/use-toast';

// Types
interface ShoppingItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  isChecked: boolean;
  mealPlanId?: number;
  recipeId?: number;
}

interface ShoppingList {
  date: string;
  mealPlanId?: number;
  items: ShoppingItem[];
}

// Query Hooks

// Get shopping list for a specific date
export function useShoppingListByDate(date: string): UseQueryResult<ShoppingList> {
  return useQuery({
    queryKey: queryKeys.shopping.byDate(date),
    queryFn: async () => {
      const response = await fetch(`/api/shopping-list?date=${date}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch shopping list');
      return response.json();
    },
    ...queryPresets.dynamic,
  });
}

// Get shopping list for a specific meal plan
export function useShoppingListByPlanId(planId: number | undefined): UseQueryResult<ShoppingList> {
  return useQuery({
    queryKey: queryKeys.shopping.byPlanId(planId!),
    queryFn: async () => {
      if (!planId) throw new Error('Meal plan ID is required');
      
      const response = await fetch(`/api/shopping-list?mealPlanId=${planId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch shopping list');
      return response.json();
    },
    enabled: !!planId,
    ...queryPresets.dynamic,
  });
}

// Get weekly shopping list (consolidated for the week)
export function useWeeklyShoppingList(startDate: string): UseQueryResult<ShoppingList> {
  return useQuery({
    queryKey: queryKeys.shopping.weekly(startDate),
    queryFn: async () => {
      const response = await fetch(`/api/shopping-list/weekly?startDate=${startDate}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch weekly shopping list');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Mutation Hooks

// Add item to shopping list
export function useAddShoppingItem(date: string): UseMutationResult<ShoppingItem, Error, Omit<ShoppingItem, 'id' | 'isChecked'>> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (itemData) => {
      const response = await fetch('/api/shopping-list/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...itemData, date }),
      });
      if (!response.ok) throw new Error('Failed to add item');
      return response.json();
    },
    onMutate: async (newItem) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.byDate(date) });
      const previous = queryClient.getQueryData(queryKeys.shopping.byDate(date));
      
      queryClient.setQueryData(queryKeys.shopping.byDate(date), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: [...old.items, { ...newItem, id: Date.now(), isChecked: false }],
        };
      });
      
      return { previous };
    },
    onError: (err, newItem, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.byDate(date), context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.shoppingList(date);
      toast({
        title: "Success",
        description: "Item added to shopping list",
      });
    },
  });
}

// Toggle item checked status
export function useToggleShoppingItem(date: string): UseMutationResult<ShoppingItem, Error, number> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId) => {
      const response = await fetch(`/api/shopping-list/items/${itemId}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to toggle item');
      return response.json();
    },
    onMutate: async (itemId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.byDate(date) });
      const previous = queryClient.getQueryData(queryKeys.shopping.byDate(date));
      
      queryClient.setQueryData(queryKeys.shopping.byDate(date), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: ShoppingItem) =>
            item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
          ),
        };
      });
      
      return { previous };
    },
    onError: (err, itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.byDate(date), context.previous);
      }
    },
    onSettled: () => {
      // Silently refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.shopping.byDate(date) });
    },
  });
}

// Update shopping item
export function useUpdateShoppingItem(date: string): UseMutationResult<ShoppingItem, Error, { id: number; data: Partial<ShoppingItem> }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/shopping-list/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.byDate(date) });
      const previous = queryClient.getQueryData(queryKeys.shopping.byDate(date));
      
      queryClient.setQueryData(queryKeys.shopping.byDate(date), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: ShoppingItem) =>
            item.id === id ? { ...item, ...data } : item
          ),
        };
      });
      
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.byDate(date), context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.shoppingList(date);
      toast({
        title: "Success",
        description: "Item updated",
      });
    },
  });
}

// Delete shopping item
export function useDeleteShoppingItem(date: string): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (itemId) => {
      const response = await fetch(`/api/shopping-list/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete item');
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping.byDate(date) });
      const previous = queryClient.getQueryData(queryKeys.shopping.byDate(date));
      
      queryClient.setQueryData(queryKeys.shopping.byDate(date), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item: ShoppingItem) => item.id !== itemId),
        };
      });
      
      return { previous };
    },
    onError: (err, itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping.byDate(date), context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.shoppingList(date);
      toast({
        title: "Success",
        description: "Item removed",
      });
    },
  });
}

// Clear all checked items
export function useClearCheckedItems(date: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/shopping-list/clear-checked?date=${date}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to clear checked items');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.shoppingList(date);
      toast({
        title: "Success",
        description: "Checked items removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear checked items",
        variant: "destructive",
      });
    },
  });
}
