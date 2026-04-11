# Issues Found & Fixes Needed

## 1. Shopping List Not Visible After Onboarding ❌

**Problem:**
- Shopping list IS generated on the backend (confirmed in logs)
- Shopping list IS saved to database 
- BUT frontend doesn't show it after onboarding completes

**Root Cause:**
The `SimpleMealPlanningQuiz.tsx` navigates to `/dashboard` immediately after meal plan generation, but the shopping list query invalidation might not have time to refetch before navigation.

**Fix Location:** `client/src/pages/SimpleMealPlanningQuiz.tsx` line ~200-212

**Current Code:**
```typescript
// Invalidate all meal plan related queries to refresh data
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/today'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/all'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/recipes'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] })
]);

// Wait a moment for queries to refetch
await new Promise(resolve => setTimeout(resolve, 500));

toast({
  title: "Meal plan created!",
  description: "Your personalized meal plan is ready.",
});
setLocation("/dashboard");
```

**Fix Needed:**
```typescript
// Invalidate all meal plan related queries to refresh data
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/today'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/meal-plans/all'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/recipes'] }),
  queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] })
]);

// Prefetch shopping list to ensure it's loaded before navigation
await queryClient.prefetchQuery({
  queryKey: ['/api/shopping-list'],
  queryFn: async () => {
    const res = await fetch('/api/shopping-list', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch shopping list');
    return res.json();
  }
});

toast({
  title: "Meal plan created!",
  description: "Your personalized meal plan and shopping list are ready.",
});
setLocation("/dashboard");
```

## 2. Meal Plan "Restarts" During Generation (Needs Investigation) ⚠️

**Problem:**
User reports that during onboarding, the meal plan generation reaches Day 7, then restarts and generates again.

**Possible Causes:**
1. React Query refetching causing duplicate API calls
2. Component unmounting/remounting
3. Progress polling triggering a re-render that causes mutation to fire twice
4. Race condition in the SimpleMealPlanningQuiz component

**Investigation Needed:**
- Check if `saveMealPlanPreferences.mutateAsync(data)` is being called twice
- Check if there's a useEffect that might trigger generation multiple times
- Check React Query devtools to see if mutation is called twice

**Fix Location:** `client/src/pages/SimpleMealPlanningQuiz.tsx`

**Possible Fix:**
Add a ref to prevent double submission:

```typescript
const isSubmitting = useRef(false);

const onSubmit = async (data: MealPlanPreferencesForm) => {
  if (isSubmitting.current) {
    console.log('Already submitting, preventing duplicate');
    return;
  }
  
  isSubmitting.current = true;
  
  try {
    const duration = "week";
    const daysCount = duration === '3days' ? 3 : duration === 'week' ? 7 : duration === 'twoWeeks' ? 14 : 7;
    setMealPlanDays(daysCount);
    
    setIsGeneratingMealPlan(true);
    await saveMealPlanPreferences.mutateAsync(data);
  } finally {
    isSubmitting.current = false;
  }
};
```

## Summary

✅ **Confirmed Working:**
- Database schema is now correct
- Meal plan generation works
- Shopping list generation works
- Shopping list is saved to database

❌ **Not Working:**
- Shopping list doesn't appear in UI after onboarding
- Meal plan might generate twice (needs user confirmation)

🔧 **Priority Fix:**
Fix #1 (Shopping List Visibility) - High Priority
