// Centralized Query Invalidation Utilities
// Handles cache invalidation for related queries

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export class QueryInvalidator {
  constructor(private queryClient: QueryClient) {}
  
  // Food Logs invalidation
  async foodLogs(date?: string, options?: { refetch?: boolean }) {
    const promises: Promise<void>[] = [];
    
    // Always invalidate all food logs
    promises.push(
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.foodLogs.all(),
        ...options,
      })
    );
    
    // If date provided, invalidate specific date queries
    if (date) {
      promises.push(
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.foodLogs.byDate(date),
          ...options,
        }),
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.foodLogs.totals(date),
          ...options,
        })
      );
    }
    
    // Also invalidate scanned meals
    promises.push(
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.foodLogs.scanned(),
        ...options,
      }),
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.foodLogs.scannedToday(),
        ...options,
      })
    );
    
    await Promise.all(promises);
  }
  
  // Recipes invalidation
  async recipes(recipeId?: number) {
    const promises: Promise<void>[] = [];
    
    // Invalidate all recipe lists
    promises.push(
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.recipes.all(),
      }),
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.recipes.created(),
      }),
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.recipes.saved(),
      })
    );
    
    // If specific recipe, invalidate it
    if (recipeId) {
      promises.push(
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.recipes.byId(recipeId),
        })
      );
    }
    
    await Promise.all(promises);
  }
  
  // Meal Plans invalidation
  async mealPlans(date?: string, planId?: number) {
    const promises: Promise<void>[] = [];
    
    // Always invalidate lists
    promises.push(
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlans.all(),
      }),
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlans.today(),
      })
    );
    
    // Date-specific invalidation
    if (date) {
      promises.push(
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.mealPlans.byDate(date),
        })
      );
    }
    
    // Plan-specific invalidation
    if (planId) {
      promises.push(
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.mealPlans.byId(planId),
        }),
        // Also invalidate related shopping list
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.shopping.byPlanId(planId),
        })
      );
    }
    
    await Promise.all(promises);
  }
  
  // Shopping List invalidation
  async shoppingList(date?: string, planId?: number) {
    const promises: Promise<void>[] = [];
    
    promises.push(
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.shopping.all(),
      })
    );
    
    if (date) {
      promises.push(
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.shopping.byDate(date),
        }),
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.shopping.weekly(date),
        })
      );
    }
    
    if (planId) {
      promises.push(
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.shopping.byPlanId(planId),
        })
      );
    }
    
    await Promise.all(promises);
  }
  
  // Progress invalidation
  async progress(type?: 'photos' | 'weights' | 'measurements' | 'bodyFat') {
    if (!type) {
      // Invalidate all progress data
      await this.queryClient.invalidateQueries({
        queryKey: queryKeys.progress.all(),
      });
    } else {
      // Invalidate specific type
      const keyMap = {
        photos: queryKeys.progress.photos(),
        weights: queryKeys.progress.weights(),
        measurements: queryKeys.progress.measurements(),
        bodyFat: queryKeys.progress.bodyFat(),
      };
      
      await this.queryClient.invalidateQueries({
        queryKey: keyMap[type],
      });
    }
  }
  
  // User data invalidation
  async user() {
    await this.queryClient.invalidateQueries({
      queryKey: queryKeys.user.all(),
    });
  }
  
  // Clear all caches (for logout)
  async clearAll() {
    await this.queryClient.clear();
  }
}

// Export factory function
export const createInvalidator = (client: QueryClient) => new QueryInvalidator(client);
