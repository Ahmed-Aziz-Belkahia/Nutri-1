# Data Fetching Audit & Standardization Plan

## Executive Summary

This document provides a comprehensive audit of all data fetching patterns across the NutriApp application and proposes a standardized approach to ensure data freshness and consistency across page navigations.

**Date**: October 28, 2025
**Status**: Planning Phase (No Implementation Yet)

---

## 🔍 Current State Analysis

### 1. Data Fetching Technologies Used
- **Primary**: TanStack Query (React Query) v5
- **Secondary**: Native fetch API with manual state management
- **Pattern**: Mixed approach with inconsistent configurations

### 2. Query Configuration Discovery

#### Global Configuration (`client/src/lib/queryClient.ts`)
```typescript
staleTime: 600000        // 10 minutes - data stays fresh
gcTime: 3600000          // 1 hour - keep in cache
refetchOnWindowFocus: false  // Don't refetch on focus
refetchOnReconnect: true     // Refetch when reconnecting
refetchOnMount: [DEFAULT]    // Not specified (defaults to true if data is stale)
```

#### Page-Level Overrides Found

**Highly Cached (Long staleTime)**:
- `App.tsx` prefetcher: 10 minutes for most queries
- `RecipesNew.tsx`: 5 minutes for all recipes
- `MealPlanTab.tsx`: 5 minutes for meal plans
- `DashboardNew.tsx`: 5 minutes for all meal plans
- `Progress.tsx`: 5 minutes for user profile

**Always Fresh (staleTime: 0)**:
- `Recipes.tsx`: All queries (created recipes, saved recipes, meal plans, grocery list)
- `MealPlanView.tsx`: Meal plans data

**Moderate Caching**:
- `ImprovedShoppingList.tsx`: 1 minute for shopping list
- `TodaysMealPlans.tsx`: 10 seconds for meal plan data

**Explicit Refetch Behavior**:
- `Recipes.tsx`: `refetchOnMount: "always"` for all queries
- `MealPlanView.tsx`: `refetchOnMount: "always"`
- `TodaysMealPlans.tsx`: `refetchOnMount: true`

---

## 📊 Data Categories & Current Patterns

### Category 1: User Authentication & Profile
**Endpoints**: `/api/auth/me`, `/api/user/profile`, `/api/user-nutrition-preferences`

**Current Pattern**:
- **Hook**: `use-auth.tsx`
- **staleTime**: 10 minutes (from global config)
- **refetchOnMount**: Default (true if stale)
- **Issue**: Profile changes not immediately reflected across pages

**Pages Using**:
- All protected pages via `useAuth` hook
- `Progress.tsx` with separate query (5min cache)
- `DashboardNew.tsx` indirectly via hook

### Category 2: Food Logs (Daily Meals)
**Endpoints**: `/api/food-logs`, `/api/food-logs?date=YYYY-MM-DD`

**Current Pattern**:
- **Multiple Patterns**: Different caching per page
- **DashboardNew**: Uses global 10min cache
- **AllMeals**: Custom queries with date filters
- **MealDetail**: Individual meal fetching

**Pages Using**:
- `DashboardNew.tsx`: Daily food logs by date
- `AllMeals.tsx`: Paginated food logs
- `MealDetail.tsx`: Single meal details
- `FoodDetail.tsx`: Single food item
- `TodaysMealPlans.tsx`: For completion tracking

**Invalidation Points**:
- After adding food
- After editing meal
- After deleting meal
- After completing meal plan meal

**Issues**:
- Inconsistent query keys: `['food-logs']`, `['food-logs', date]`, `['/api/food-logs']`
- Some use endpoint as key, others use descriptive key
- Dashboard doesn't always refresh when returning from meal detail

### Category 3: Recipes & Scanned Meals
**Endpoints**: `/api/recipes`, `/api/food-logs/scanned`, `/api/recipes/:id`, `/api/recipes/food-log/:id`

**Current Pattern**:
- **RecipesNew**: 5min cache for scanned meals
- **Recipes**: Always fresh (staleTime: 0)
- **RecipeDetail**: Uses global 10min cache

**Pages Using**:
- `RecipesNew.tsx`: Today's + all scanned meals
- `Recipes.tsx`: Created + saved recipes
- `RecipeDetail.tsx`: Single recipe view
- `CookingMode.tsx`: Recipe for cooking
- `AllRecipesSection.tsx`: Display component

**Query Keys Found**:
- `['recipes', 'today']`
- `['recipes', 'all']`
- `['/api/recipes', 'created']`
- `['/api/recipes', 'saved']`
- `['recipe', id]`
- `['recipe', 'food-log', id]`

**Issues**:
- Mixed key formats (descriptive vs endpoint-based)
- RecipeDetail doesn't refresh after editing in CookingMode
- New scans don't appear in list until manual refresh

### Category 4: Meal Plans
**Endpoints**: `/api/meal-plans/today`, `/api/meal-plans/all`, `/api/meal-plans/:id`

**Current Pattern**:
- **DashboardNew**: 5min cache for all plans
- **MealPlanView**: Always fresh (staleTime: 0)
- **Recipes**: Always fresh (staleTime: 0)
- **MealPlanTab**: 5min cache

**Pages Using**:
- `DashboardNew.tsx`: Shows today's plan
- `MealPlanView.tsx`: Full meal plan display
- `Recipes.tsx`: Meal plan tab
- `MealPlanTab.tsx`: Component in RecipesNew
- `TodaysMealPlans.tsx`: Today's meals
- `SimpleMealPlanningQuiz.tsx`: Creates plans

**Query Keys Found**:
- `['all-meal-plans']`
- `['/api/meal-plans/all']`
- `['/api/meal-plans/today']`
- `['meal-plan', date]`
- `['meal-plans']`

**Issues**:
- Same data, different query keys across pages
- Plans created in quiz don't immediately show in dashboard
- Completing a meal doesn't refresh plan state everywhere
- Date-based filtering done client-side in some places, server-side in others

### Category 5: Shopping/Grocery Lists
**Endpoints**: `/api/meal-plans/:id/shopping-list`, `/api/shopping-list`

**Current Pattern**:
- **DashboardNew**: 5min cache
- **MealPlanTab**: Separate weekly and daily lists
- **ImprovedShoppingList**: 1min cache
- **Multiple Components**: EmbeddedShoppingList, TranslatedShoppingList, PremiumShoppingList

**Pages Using**:
- `DashboardNew.tsx`: Embedded grocery list
- `ImprovedShoppingList.tsx`: Full shopping list page
- `MealPlanTab.tsx`: Integrated in meal plan
- `ShoppingList.tsx`: Legacy page
- `EnhancedShoppingList.tsx`: Another variation

**Query Keys Found**:
- `['grocery-list', date, mealPlanId]`
- `['/api/shopping-list', date]`
- `['weekly-grocery-list', date]`
- `['shopping-list']`

**Issues**:
- Multiple shopping list implementations with different data models
- Checking off items doesn't sync across all views
- Different query keys for same data

### Category 6: Progress Photos & Body Analysis
**Endpoints**: `/api/progress-photos`, `/api/body-fat/analyze`

**Current Pattern**:
- **Progress**: Various custom patterns
- **UnifiedProgress**: Manual state + queries
- **BodyFatAnalysis**: Mutation-based

**Pages Using**:
- `Progress.tsx`: Gallery view
- `UnifiedProgress.tsx`: Combined progress tracking
- `BodyFatAnalysis.tsx`: Photo upload and analysis

**Query Keys Found**:
- `['/api/progress-photos']`
- Custom state management

**Issues**:
- Photos don't appear immediately after upload
- Analysis results not cached
- Heavy re-fetching on navigation

---

## 🎯 Identified Problems

### Critical Issues

1. **Inconsistent Query Keys**
   - Same data accessed with different query keys
   - Mix of endpoint-based (`['/api/meal-plans']`) and descriptive (`['meal-plans']`)
   - Makes cache invalidation unpredictable

2. **Stale Data After Mutations**
   - Creating meal plan → Dashboard doesn't update
   - Scanning meal → RecipesNew doesn't show new scan
   - Completing meal → Plan state not updated everywhere
   - Editing food log → Totals don't recalculate immediately

3. **Over-Caching vs Under-Caching**
   - Some pages cache for 10 minutes (too long for dynamic data)
   - Others never cache (staleTime: 0, causes excessive fetches)
   - No middle ground for frequently changing data

4. **Missing Refetch Triggers**
   - Navigating Dashboard → Recipes → Dashboard doesn't refresh
   - Background tab → Foreground doesn't fetch updates
   - Network reconnect doesn't always trigger refetch

5. **Duplicate Data Fetching**
   - Multiple components fetch same data independently
   - No shared cache due to different query keys
   - Wasteful network requests

### Performance Issues

1. **Excessive Network Requests**
   - Pages refetch data they already have
   - No optimistic updates for better UX
   - Loading states flash even with cached data

2. **Large Bundle of Queries**
   - Some pages trigger 10+ queries on mount
   - Sequential fetching instead of parallel
   - No query prioritization

3. **Memory Leaks Potential**
   - Long gcTime (1 hour) with many queries
   - No cleanup strategy for old data
   - Cache grows indefinitely

---

## 🎨 Proposed Standardization Plan

### Phase 1: Query Key Standardization (Week 1)

#### 1.1 Define Standard Query Key Format

**Format**: `[resource, ...identifiers, ...filters]`

**Examples**:
```typescript
// User & Auth
['user']                                // Current user
['user', 'profile']                     // User profile
['user', 'nutrition-preferences']       // Nutrition prefs

// Food Logs
['food-logs', date]                     // Daily logs
['food-logs', 'all']                    // All logs
['food-log', id]                        // Single log

// Recipes
['recipes', 'scanned']                  // All scanned meals
['recipes', 'scanned', 'today']         // Today's scans
['recipes', 'created']                  // User created
['recipes', 'saved']                    // Saved recipes
['recipe', id]                          // Single recipe
['recipe', 'food-log', id]              // Food log recipe

// Meal Plans
['meal-plans', 'all']                   // All plans
['meal-plan', date]                     // Plan for specific date
['meal-plan', id]                       // Specific plan by ID
['meal-plan', id, 'shopping-list']      // Plan's grocery list

// Shopping Lists
['shopping-list', date]                 // Shopping list for date
['shopping-list', 'weekly', startDate]  // Weekly list

// Progress
['progress-photos']                     // All photos
['progress-photo', id]                  // Single photo
['weight-logs']                         // Weight history
```

**Benefits**:
- Predictable key structure
- Easy to invalidate related queries
- Better TypeScript support
- Easier debugging

#### 1.2 Create Query Key Factory

**File**: `client/src/lib/queryKeys.ts`

```typescript
export const queryKeys = {
  user: {
    current: () => ['user'] as const,
    profile: () => ['user', 'profile'] as const,
    nutritionPrefs: () => ['user', 'nutrition-preferences'] as const,
  },
  foodLogs: {
    all: () => ['food-logs', 'all'] as const,
    byDate: (date: string) => ['food-logs', date] as const,
    single: (id: number) => ['food-log', id] as const,
    totals: (date: string) => ['food-logs', date, 'totals'] as const,
  },
  recipes: {
    scanned: () => ['recipes', 'scanned'] as const,
    scannedToday: () => ['recipes', 'scanned', 'today'] as const,
    created: () => ['recipes', 'created'] as const,
    saved: () => ['recipes', 'saved'] as const,
    single: (id: number) => ['recipe', id] as const,
    foodLog: (id: number) => ['recipe', 'food-log', id] as const,
  },
  mealPlans: {
    all: () => ['meal-plans', 'all'] as const,
    byDate: (date: string) => ['meal-plan', date] as const,
    byId: (id: number) => ['meal-plan', id] as const,
    shoppingList: (id: number) => ['meal-plan', id, 'shopping-list'] as const,
  },
  shoppingList: {
    byDate: (date: string) => ['shopping-list', date] as const,
    weekly: (startDate: string) => ['shopping-list', 'weekly', startDate] as const,
  },
  progress: {
    photos: () => ['progress-photos'] as const,
    photo: (id: number) => ['progress-photo', id] as const,
    weights: () => ['weight-logs'] as const,
  },
};
```

**Action Items**:
- [ ] Create queryKeys.ts file
- [ ] Update all useQuery hooks to use factory keys
- [ ] Update all invalidateQueries to use factory keys
- [ ] Add TypeScript types for query data

### Phase 2: Cache Strategy Standardization (Week 2)

#### 2.1 Define Cache Tiers

**Tier 1: Static/Rarely Changing (30 minutes)**
- User profile
- Nutrition preferences
- Recipe database
- Settings

**Tier 2: Moderately Dynamic (5 minutes)**
- Food logs (completed meals)
- Meal plans (past/future days)
- Progress photos
- Weight logs

**Tier 3: Highly Dynamic (1 minute)**
- Today's food logs
- Today's meal plan
- Active shopping list
- Real-time totals

**Tier 4: Always Fresh (0 seconds)**
- Active cooking session
- Live meal scanning
- Real-time notifications
- Admin dashboard stats

#### 2.2 Update Global Defaults

**File**: `client/src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // Default 5 minutes
      gcTime: 30 * 60 * 1000,          // 30 minutes (reduced from 1 hour)
      refetchOnWindowFocus: true,      // Changed to true for freshness
      refetchOnMount: true,            // Always refetch on mount if stale
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: 300,
    },
  },
});
```

#### 2.3 Create Query Option Presets

**File**: `client/src/lib/queryOptions.ts`

```typescript
export const cachePresets = {
  static: {
    staleTime: 30 * 60 * 1000,   // 30 minutes
    gcTime: 60 * 60 * 1000,      // 1 hour
  },
  moderate: {
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
  },
  dynamic: {
    staleTime: 1 * 60 * 1000,    // 1 minute
    gcTime: 10 * 60 * 1000,      // 10 minutes
  },
  realtime: {
    staleTime: 0,                // Always stale
    gcTime: 0,                   // Don't keep in cache
    refetchOnMount: 'always',
  },
};
```

**Usage Example**:
```typescript
useQuery({
  queryKey: queryKeys.foodLogs.byDate(selectedDate),
  queryFn: () => fetchFoodLogs(selectedDate),
  ...cachePresets.dynamic,  // Apply preset
});
```

**Action Items**:
- [ ] Create queryOptions.ts with presets
- [ ] Update queryClient.ts defaults
- [ ] Audit each query and assign appropriate tier
- [ ] Document tier assignments

### Phase 3: Refetch Strategy (Week 3)

#### 3.1 Enable Refetch on Navigation

**Strategy**: Always refetch when returning to a page

**Implementation**: Use `refetchOnMount: true` globally

**Exceptions**: Only for "realtime" tier data where `refetchOnMount: 'always'`

#### 3.2 Enable Refetch on Window Focus

**Strategy**: Fetch updates when user returns to app

**Current**: Disabled globally (`refetchOnWindowFocus: false`)
**Proposed**: Enable selectively for important data

**Implementation**:
```typescript
// In queryClient.ts - change global default to true
refetchOnWindowFocus: true,

// For queries that shouldn't refetch on focus (rare cases):
useQuery({
  queryKey: queryKeys.recipes.scanned(),
  ...cachePresets.moderate,
  refetchOnWindowFocus: false, // Override for this specific query
});
```

#### 3.3 Smart Refetch on Reconnect

**Current**: Enabled globally (good!)
**Proposed**: Keep enabled, but add success toast for user awareness

#### 3.4 Background Refetch for Active Data

**Strategy**: Poll active/critical data in background

**Use Cases**:
- Meal plan when on dashboard (user might complete meals)
- Shopping list when viewing it (items might be purchased)
- Daily totals when tracking macros

**Implementation**:
```typescript
useQuery({
  queryKey: queryKeys.mealPlans.byDate(today),
  ...cachePresets.dynamic,
  refetchInterval: 30 * 1000, // Poll every 30 seconds when page is focused
  refetchIntervalInBackground: false, // Stop when page loses focus
});
```

**Action Items**:
- [ ] Enable refetchOnWindowFocus globally
- [ ] Add refetchInterval for dashboard meal plan
- [ ] Add refetchInterval for active shopping list
- [ ] Test refetch behavior across all pages

### Phase 4: Optimistic Updates & Cache Invalidation (Week 4)

#### 4.1 Implement Optimistic Updates

**Pattern**: Update cache immediately, rollback on error

**Use Cases**:
- Marking shopping list items as purchased
- Completing meal plan meals
- Editing food quantities
- Quick toggles (favorites, etc.)

**Example**:
```typescript
const togglePurchased = useMutation({
  mutationFn: (itemId) => api.toggleShoppingItem(itemId),
  onMutate: async (itemId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.shoppingList.byDate(date) });
    
    // Snapshot current value
    const previous = queryClient.getQueryData(queryKeys.shoppingList.byDate(date));
    
    // Optimistically update
    queryClient.setQueryData(queryKeys.shoppingList.byDate(date), (old) =>
      old.map(item => 
        item.id === itemId ? { ...item, isPurchased: !item.isPurchased } : item
      )
    );
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKeys.shoppingList.byDate(date), context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.byDate(date) });
  },
});
```

#### 4.2 Standardize Cache Invalidation

**Create Invalidation Helper**:

**File**: `client/src/lib/cacheInvalidation.ts`

```typescript
export const invalidateRelatedQueries = {
  // When food log changes
  foodLog: (queryClient: QueryClient, date: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.foodLogs.byDate(date) });
    queryClient.invalidateQueries({ queryKey: queryKeys.foodLogs.totals(date) });
    queryClient.invalidateQueries({ queryKey: queryKeys.foodLogs.all() });
  },
  
  // When meal plan changes
  mealPlan: (queryClient: QueryClient, date: string, planId?: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.byDate(date) });
    if (planId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.byId(planId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.shoppingList(planId) });
    }
  },
  
  // When recipe is scanned
  recipe: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes.scanned() });
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes.scannedToday() });
  },
  
  // When shopping list item toggled
  shoppingList: (queryClient: QueryClient, date: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.byDate(date) });
    // Also invalidate meal plan to update completion status
    queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.byDate(date) });
  },
  
  // When progress photo uploaded
  progress: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.progress.photos() });
  },
};
```

**Usage**:
```typescript
const addFoodMutation = useMutation({
  mutationFn: addFood,
  onSuccess: (data, variables) => {
    invalidateRelatedQueries.foodLog(queryClient, selectedDate);
    toast.success('Food added successfully');
  },
});
```

**Action Items**:
- [ ] Create cacheInvalidation.ts helper
- [ ] Add optimistic updates for common actions
- [ ] Update all mutations to use invalidation helpers
- [ ] Add loading/optimistic UI states

### Phase 5: Custom Hooks for Common Patterns (Week 5)

#### 5.1 Create Reusable Query Hooks

**File**: `client/src/hooks/queries/useFoodLogs.ts`

```typescript
export function useFoodLogs(date: string) {
  return useQuery({
    queryKey: queryKeys.foodLogs.byDate(date),
    queryFn: () => api.getFoodLogs(date),
    ...cachePresets.dynamic,
  });
}

export function useDailyTotals(date: string) {
  return useQuery({
    queryKey: queryKeys.foodLogs.totals(date),
    queryFn: () => api.getDailyTotals(date),
    ...cachePresets.dynamic,
  });
}
```

**File**: `client/src/hooks/queries/useMealPlans.ts`

```typescript
export function useTodayMealPlan() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: queryKeys.mealPlans.byDate(today),
    queryFn: () => api.getMealPlan(today),
    ...cachePresets.dynamic,
    refetchInterval: 30 * 1000, // Poll for updates
  });
}

export function useAllMealPlans() {
  return useQuery({
    queryKey: queryKeys.mealPlans.all(),
    queryFn: () => api.getAllMealPlans(),
    ...cachePresets.moderate,
  });
}

export function useMealPlanShoppingList(planId: number) {
  return useQuery({
    queryKey: queryKeys.mealPlans.shoppingList(planId),
    queryFn: () => api.getShoppingList(planId),
    ...cachePresets.dynamic,
    enabled: !!planId, // Only fetch if we have a plan ID
  });
}
```

#### 5.2 Create Mutation Hooks

**File**: `client/src/hooks/mutations/useFoodLogMutations.ts`

```typescript
export function useAddFoodLog(date: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AddFoodData) => api.addFoodLog(data),
    onSuccess: () => {
      invalidateRelatedQueries.foodLog(queryClient, date);
    },
  });
}

export function useUpdateFoodLog(date: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFoodData }) =>
      api.updateFoodLog(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.foodLogs.byDate(date) });
      const previous = queryClient.getQueryData(queryKeys.foodLogs.byDate(date));
      
      queryClient.setQueryData(queryKeys.foodLogs.byDate(date), (old: any[]) =>
        old.map(item => item.id === id ? { ...item, ...data } : item)
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKeys.foodLogs.byDate(date), context.previous);
    },
    onSettled: () => {
      invalidateRelatedQueries.foodLog(queryClient, date);
    },
  });
}
```

**Action Items**:
- [ ] Create hooks directory structure
- [ ] Move all data fetching to custom hooks
- [ ] Update all pages to use custom hooks
- [ ] Add TypeScript types for all query/mutation data

### Phase 6: Monitoring & Testing (Week 6)

#### 6.1 Add Query Developer Tools

**Install**: `@tanstack/react-query-devtools`

```typescript
// In App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  {process.env.NODE_ENV === 'development' && (
    <ReactQueryDevtools initialIsOpen={false} />
  )}
</QueryClientProvider>
```

#### 6.2 Add Query Logging

**File**: `client/src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ... existing config
      onError: (error) => {
        console.error('[Query Error]', error);
      },
      onSuccess: (data, query) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Query Success]', query.queryKey, data);
        }
      },
    },
    mutations: {
      onError: (error) => {
        console.error('[Mutation Error]', error);
      },
    },
  },
});
```

#### 6.3 Add Performance Monitoring

```typescript
// Track query performance
const queryMetrics = {
  totalQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  avgResponseTime: 0,
};

// Log to analytics
useEffect(() => {
  const observer = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated') {
      // Track metrics
    }
  });
  
  return () => observer();
}, []);
```

#### 6.4 Create Test Suite

**Test Categories**:
- Query key generation
- Cache invalidation logic
- Optimistic update rollback
- Refetch behavior
- Memory leaks

**Action Items**:
- [ ] Install React Query Devtools
- [ ] Add query logging in development
- [ ] Create performance monitoring dashboard
- [ ] Write integration tests for data flow
- [ ] Load test with multiple simultaneous queries

---

## 📋 Implementation Checklist

### Week 1: Foundation
- [ ] Create `queryKeys.ts` factory
- [ ] Create `queryOptions.ts` with presets
- [ ] Update 5 core queries to use new keys
- [ ] Document key naming conventions

### Week 2: Cache Strategy
- [ ] Audit all queries and categorize by tier
- [ ] Update `queryClient.ts` with new defaults
- [ ] Apply appropriate cache presets to 20+ queries
- [ ] Test cache behavior across navigation

### Week 3: Refetch Logic
- [ ] Enable `refetchOnWindowFocus` globally
- [ ] Add `refetchInterval` for 3 critical queries
- [ ] Test refetch on reconnect
- [ ] Add user feedback for background updates

### Week 4: Mutations
- [ ] Create `cacheInvalidation.ts` helper
- [ ] Add optimistic updates for 5 common actions
- [ ] Update all mutations to use invalidation helpers
- [ ] Test rollback behavior

### Week 5: Custom Hooks
- [ ] Create `hooks/queries/` structure
- [ ] Create `hooks/mutations/` structure
- [ ] Migrate 10 most-used queries to hooks
- [ ] Update 5 pages to use new hooks

### Week 6: Testing & Refinement
- [ ] Install and configure Devtools
- [ ] Add query logging
- [ ] Run full app navigation test
- [ ] Fix any discovered issues
- [ ] Document final patterns

---

## 🎯 Success Metrics

### Quantitative Goals
- **Reduce duplicate queries**: 50% reduction in network requests
- **Improve cache hit rate**: From ~30% to 70%+
- **Faster page transitions**: < 100ms for cached data
- **Reduce memory usage**: Keep cache under 50MB
- **Consistent data**: 100% of mutations trigger correct invalidations

### Qualitative Goals
- **Developer experience**: Clear, predictable patterns
- **User experience**: No stale data visible to user
- **Maintainability**: Easy to add new queries
- **Debugging**: Quick to identify data flow issues
- **Performance**: Smooth, responsive UI

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Implement changes incrementally, one category at a time
- Keep old query keys working temporarily (deprecate, don't remove)
- Extensive testing after each phase
- Feature flags for new behavior

### Risk 2: Performance Regression
**Mitigation**:
- Monitor query metrics before and after
- Load testing with realistic scenarios
- Profile memory usage
- Rollback plan for each phase

### Risk 3: Over-Refetching
**Mitigation**:
- Start conservative (higher staleTime)
- Gradually reduce as needed
- Monitor network tab during testing
- Add refetch intervals only where necessary

### Risk 4: Under-Caching
**Mitigation**:
- Watch for loading flashes
- User feedback during beta testing
- Analytics on cache hit rate
- Adjust presets based on real usage

---

## 📖 Documentation Requirements

### Developer Documentation
- [ ] Query key naming guide
- [ ] Cache tier decision tree
- [ ] Custom hook creation guide
- [ ] Mutation pattern examples
- [ ] Troubleshooting guide

### User-Facing
- [ ] Release notes explaining improvements
- [ ] Known issues and workarounds
- [ ] Performance tips

---

## 🔄 Future Enhancements (Post-Implementation)

### Phase 7: Advanced Patterns
- [ ] Implement infinite queries for paginated lists
- [ ] Add parallel queries with `useQueries` for dashboard
- [ ] Implement dependent queries (query B waits for query A)
- [ ] Add query cancellation for abandoned navigations

### Phase 8: Offline Support
- [ ] Persist cache to localStorage
- [ ] Implement offline mutation queue
- [ ] Sync on reconnect
- [ ] Conflict resolution strategy

### Phase 9: Real-time Updates
- [ ] WebSocket integration for live data
- [ ] Server-sent events for notifications
- [ ] Optimistic UI for all mutations
- [ ] Real-time collaboration features

---

## 📞 Contact & Questions

**Document Owner**: Development Team
**Last Updated**: October 28, 2025
**Status**: Awaiting Approval for Implementation

**Questions?**
- Open GitHub issue with label `data-fetching`
- Tag `@devteam` in Slack #engineering channel

---

## Appendix A: Current Query Key Inventory

### Complete List of Query Keys Found

```typescript
// User & Auth
['user']
['/api/auth/me']

// Food Logs
['food-logs']
['food-logs', date]
['/api/food-logs']
['/api/food-logs', date]
['food-log', id]

// Recipes
['recipes', 'today']
['recipes', 'all']
['/api/recipes', 'created']
['/api/recipes', 'saved']
['recipe', id]
['recipe', 'food-log', id]

// Meal Plans
['all-meal-plans']
['/api/meal-plans/all']
['/api/meal-plans/today']
['meal-plan', date]
['meal-plans']

// Shopping Lists
['grocery-list', date, mealPlanId]
['/api/shopping-list', date]
['weekly-grocery-list', date]
['shopping-list']

// Progress
['/api/progress-photos']
['progress-photo', id]
['weight-logs']

// Admin
['/api/admin/users']
['/api/admin/stats']
```

### Total Unique Patterns: **31+**
### Recommended Patterns: **15**
### Consolidation Potential: **52% reduction**

---

## Appendix B: Page-by-Page Query Audit

### DashboardNew.tsx
- `['food-logs', date]` - Food logs
- `['daily-totals', date]` - Daily nutrition totals
- `['all-meal-plans']` - All meal plans
- `['grocery-list', date, planId]` - Shopping list
**Issues**: Multiple date-based queries, potential over-fetching

### RecipesNew.tsx
- `['recipes', 'today']` - Today's scans (5min cache)
- `['recipes', 'all']` - All scanned meals (5min cache)
**Issues**: Doesn't refetch on return from detail page

### Recipes.tsx (Old)
- `['/api/recipes', 'created']` - User recipes (staleTime: 0)
- `['/api/recipes', 'saved']` - Saved recipes (staleTime: 0)
- `['/api/meal-plans/today']` - Today's plan (staleTime: 0)
- `['/api/meal-plans/all']` - All plans (staleTime: 0)
- `['grocery-list']` - Shopping list (staleTime: 0)
**Issues**: Over-fetching with staleTime: 0

### MealPlanView.tsx
- `['/api/meal-plans/all']` - All plans (staleTime: 0, refetchOnMount: always)
**Issues**: Always refetches even with fresh data

### RecipeDetail.tsx
- `['recipe', id]` or `['recipe', 'food-log', id]` - Single recipe
**Issues**: Uses global 10min cache, doesn't update after cooking

### CookingMode.tsx
- `['recipe', id]` or `['recipe', 'food-log', id]` - Recipe data
**Issues**: Same as RecipeDetail

### AllMeals.tsx
- `['/api/food-logs']` - Paginated food logs
**Issues**: Doesn't invalidate when adding/editing from other pages

### ImprovedShoppingList.tsx
- `['/api/meal-plans/all']` - Meal plans
- `['/api/shopping-list', date]` - Shopping list (staleTime: 1min)
- `['locations']` - Store locations
- `['/api/shopping-list', date]` - Duplicate query key with different data
**Issues**: Complex state management, multiple shopping list implementations

### Progress.tsx / UnifiedProgress.tsx
- `['user', 'profile']` - User profile (staleTime: 5min)
- `['/api/progress-photos']` - All photos
**Issues**: Photos don't appear immediately after upload

### TodaysMealPlans.tsx
- `['/api/meal-plans/today']` - Today's plan (staleTime: 10s, refetchInterval possible)
**Issues**: Short staleTime causes frequent refetches

---

**END OF AUDIT DOCUMENT**
