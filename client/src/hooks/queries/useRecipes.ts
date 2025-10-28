// Recipe Query Hooks
// Reusable hooks for recipe data fetching and mutations

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { queryKeys, queryPresets, createInvalidator } from '@/lib/queryUtils';
import { useToast } from '@/hooks/use-toast';

// Types
interface Recipe {
  id: number;
  name: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  isScanned?: boolean;
  createdAt: string;
}

interface RecipeFilters {
  search?: string;
  tags?: string[];
  maxCalories?: number;
  maxPrepTime?: number;
}

// Query Hooks

// Get all recipes (with optional filters)
export function useRecipes(filters?: RecipeFilters): UseQueryResult<Recipe[]> {
  return useQuery({
    queryKey: queryKeys.recipes.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.maxCalories) params.append('maxCalories', filters.maxCalories.toString());
      if (filters?.maxPrepTime) params.append('maxPrepTime', filters.maxPrepTime.toString());
      
      const response = await fetch(`/api/recipes?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Get user's created recipes
export function useCreatedRecipes(): UseQueryResult<Recipe[]> {
  return useQuery({
    queryKey: queryKeys.recipes.created(),
    queryFn: async () => {
      const response = await fetch('/api/recipes?filter=created', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch created recipes');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Get user's saved/favorited recipes
export function useSavedRecipes(): UseQueryResult<Recipe[]> {
  return useQuery({
    queryKey: queryKeys.recipes.saved(),
    queryFn: async () => {
      const response = await fetch('/api/recipes?filter=saved', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch saved recipes');
      return response.json();
    },
    ...queryPresets.moderate,
  });
}

// Get scanned meals (from food logs that have recipes)
export function useScannedMeals(): UseQueryResult<Recipe[]> {
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

// Get a specific recipe by ID
// isFoodLog flag determines if this is a food-log recipe or regular recipe
export function useRecipeById(id: number | undefined, isFoodLog = false): UseQueryResult<Recipe> {
  return useQuery({
    queryKey: isFoodLog ? queryKeys.recipes.foodLog(id!) : queryKeys.recipes.byId(id!),
    queryFn: async () => {
      if (!id) throw new Error('Recipe ID is required');
      
      const endpoint = isFoodLog 
        ? `/api/recipes/food-log/${id}`
        : `/api/recipes/${id}`;
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return response.json();
    },
    enabled: !!id,
    ...queryPresets.moderate,
    // For cooking mode, always refetch when mounting
    refetchOnMount: 'always',
  });
}

// Mutation Hooks

// Create a new recipe
export function useCreateRecipe(): UseMutationResult<Recipe, Error, Omit<Recipe, 'id' | 'createdAt'>> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (recipeData) => {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(recipeData),
      });
      if (!response.ok) throw new Error('Failed to create recipe');
      return response.json();
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.recipes();
      toast({
        title: "Success",
        description: "Recipe created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create recipe",
        variant: "destructive",
      });
    },
  });
}

// Update an existing recipe
export function useUpdateRecipe(): UseMutationResult<Recipe, Error, { id: number; data: Partial<Recipe> }> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update recipe');
      return response.json();
    },
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.recipes.byId(id) });
      const previous = queryClient.getQueryData(queryKeys.recipes.byId(id));
      
      queryClient.setQueryData(queryKeys.recipes.byId(id), (old: any) => ({
        ...old,
        ...data,
      }));
      
      return { previous, id };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.recipes.byId(context.id), context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to update recipe",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      const invalidator = createInvalidator(queryClient);
      invalidator.recipes(variables.id);
      toast({
        title: "Success",
        description: "Recipe updated",
      });
    },
  });
}

// Delete a recipe
export function useDeleteRecipe(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (recipeId) => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete recipe');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.recipes();
      toast({
        title: "Success",
        description: "Recipe deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });
}

// Save/favorite a recipe
export function useSaveRecipe(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (recipeId) => {
      const response = await fetch(`/api/recipes/${recipeId}/save`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to save recipe');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.recipes();
      toast({
        title: "Success",
        description: "Recipe saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save recipe",
        variant: "destructive",
      });
    },
  });
}

// Unsave/unfavorite a recipe
export function useUnsaveRecipe(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (recipeId) => {
      const response = await fetch(`/api/recipes/${recipeId}/save`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to unsave recipe');
    },
    onSuccess: () => {
      const invalidator = createInvalidator(queryClient);
      invalidator.recipes();
      toast({
        title: "Success",
        description: "Recipe removed from saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unsave recipe",
        variant: "destructive",
      });
    },
  });
}
