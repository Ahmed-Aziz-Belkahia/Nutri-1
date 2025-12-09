// Query Key Factory for NutriApp
// Centralized, type-safe query keys for all data fetching

export const queryKeys = {
  // User & Authentication
  user: {
    all: () => ['user'] as const,
    current: () => ['user', 'current'] as const,
    profile: () => ['user', 'profile'] as const,
    nutritionPrefs: () => ['user', 'nutrition-preferences'] as const,
    preferences: () => ['user', 'preferences'] as const,
  },
  
  // Food Logs
  foodLogs: {
    all: () => ['food-logs'] as const,
    list: (filters?: { date?: string; limit?: number }) => 
      ['food-logs', 'list', filters] as const,
    byDate: (date: string) => ['food-logs', 'date', date] as const,
    byId: (id: number) => ['food-logs', 'id', id] as const,
    totals: (date: string) => ['food-logs', 'totals', date] as const,
    scanned: () => ['food-logs', 'scanned'] as const,
    scannedToday: () => ['food-logs', 'scanned', 'today'] as const,
    ingredientRecipes: () => ['foodLogs', 'ingredientRecipes'] as const,
  },
  
  // Recipes
  recipes: {
    all: () => ['recipes'] as const,
    list: (filters?: { type?: string; search?: string }) => 
      ['recipes', 'list', filters] as const,
    created: () => ['recipes', 'created'] as const,
    saved: () => ['recipes', 'saved'] as const,
    ingredientGenerated: () => ['recipes', 'ingredient-generated'] as const,
    byId: (id: number) => ['recipes', 'id', id] as const,
    foodLog: (id: number) => ['recipes', 'food-log', id] as const,
  },
  
  // Meal Plans
  mealPlans: {
    all: () => ['meal-plans'] as const,
    list: (filters?: { status?: string }) => 
      ['meal-plans', 'list', filters] as const,
    today: () => ['meal-plans', 'today'] as const,
    byDate: (date: string) => ['meal-plans', 'date', date] as const,
    byId: (id: number) => ['meal-plans', 'id', id] as const,
    byDateRange: (start: string, end: string) => 
      ['meal-plans', 'range', { start, end }] as const,
  },
  
  // Shopping Lists
  shopping: {
    all: () => ['shopping'] as const,
    byDate: (date: string) => ['shopping', 'date', date] as const,
    byPlanId: (planId: number) => ['shopping', 'plan', planId] as const,
    weekly: (startDate: string) => ['shopping', 'weekly', startDate] as const,
    items: (listId: number) => ['shopping', 'items', listId] as const,
  },
  
  // Progress & Analytics
  progress: {
    all: () => ['progress'] as const,
    photos: () => ['progress', 'photos'] as const,
    photoById: (id: number) => ['progress', 'photos', id] as const,
    weights: () => ['progress', 'weights'] as const,
    measurements: () => ['progress', 'measurements'] as const,
    bodyFat: () => ['progress', 'body-fat'] as const,
  },
  
  // Admin
  admin: {
    users: () => ['admin', 'users'] as const,
    userById: (id: number) => ['admin', 'users', id] as const,
    stats: () => ['admin', 'stats'] as const,
    logs: () => ['admin', 'logs'] as const,
  },
} as const;

// Type exports for TypeScript support
export type QueryKeys = typeof queryKeys;
export type UserKeys = ReturnType<QueryKeys['user'][keyof QueryKeys['user']]>;
export type FoodLogKeys = ReturnType<QueryKeys['foodLogs'][keyof QueryKeys['foodLogs']]>;
export type RecipeKeys = ReturnType<QueryKeys['recipes'][keyof QueryKeys['recipes']]>;
export type MealPlanKeys = ReturnType<QueryKeys['mealPlans'][keyof QueryKeys['mealPlans']]>;
export type ShoppingKeys = ReturnType<QueryKeys['shopping'][keyof QueryKeys['shopping']]>;
export type ProgressKeys = ReturnType<QueryKeys['progress'][keyof QueryKeys['progress']]>;
