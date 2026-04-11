# Food Logs Display Issue - Debugging Guide

## Problem
User reports that when scanning a second meal, only one meal shows in the dashboard (either the new one replaces the old one, or only one is visible).

## Investigation Steps

### 1. Check Database Directly
Run this on your server to see if both meals are actually in the database:

```bash
cd /usr/local/lsws/Example/html/Nutri

# Check recent food logs
sqlite3 local.db "SELECT id, user_id, name, date, calories FROM food_logs ORDER BY date DESC LIMIT 10;"
```

**Expected Result:** You should see both meals with different IDs and timestamps.

### 2. Check API Response
Monitor the logs when fetching food logs:

```bash
pm2 logs myapp --lines 100 | grep "Food Logs API"
```

Look for lines like:
- `[Food Logs API] Retrieved logs: { count: X }`
- The count should be 2 or more if you scanned multiple meals

### 3. Check Frontend Query
The dashboard uses `slice(0, 3)` to show first 3 meals, so it should display both.

## Possible Causes

### A. Date/Timezone Issue
The API might be filtering by date incorrectly, grouping meals on different days.

**Fix:** Check if `selectedDate` in Dashboard is correct:
```typescript
// In Dashboard.tsx, the query uses:
const { foodLogs } = useFoodLog(selectedDate);
```

### B. Query Cache Not Invalidating
After adding a meal, the cache might not update properly.

**Fix in `client/src/hooks/use-food-log.ts`:**
```typescript
// After successful add, this should run:
queryClient.setQueryData<FoodLogsResponse>(
  ["/api/food-logs", dateString],
  (oldData) => {
    const newLogsArray = oldData ? [data.log, ...oldData.logs] : [data.log];
    return {
      logs: newLogsArray,
      totals: data.totals
    };
  }
);
```

### C. Component State Issue
The Dashboard might have stale state.

## Quick Test

1. **Scan first meal** - Note the time
2. **Check database immediately:**
   ```bash
   sqlite3 local.db "SELECT COUNT(*) FROM food_logs WHERE user_id=YOUR_USER_ID;"
   ```
3. **Scan second meal** - Note the time
4. **Check database again** - Count should increase by 1
5. **Check frontend console** for logs from `use-food-log.ts`

## Solution Approaches

### Option 1: Force Refetch After Add
```typescript
// In use-food-log.ts after adding food
queryClient.invalidateQueries({ 
  queryKey: ["/api/food-logs", dateString],
  refetchType: 'active' 
});
```

### Option 2: Check Date Format
Ensure the date being sent matches the query date:
```typescript
// When adding food
const dateString = format(selectedDate, 'yyyy-MM-dd');
console.log('Adding food for date:', dateString);

// When fetching
console.log('Fetching food for date:', dateString);
```

### Option 3: Disable Query Caching (Testing Only)
```typescript
// In use-food-log.ts
const { data: foodLogData } = useQuery<FoodLogsResponse>({
  queryKey: ["/api/food-logs", dateString],
  staleTime: 0, // ← Change from 60000 to 0
  gcTime: 0, // ← Change from 300000 to 0
});
```

## Expected Behavior

1. Scan meal 1 → Shows 1 meal in dashboard
2. Scan meal 2 → Shows 2 meals in dashboard (newest first)
3. Scan meal 3 → Shows 3 meals in dashboard
4. Scan meal 4 → Shows 3 meals (first 3, due to slice(0, 3))

## Next Steps

Run the database check first to confirm both meals are actually being saved. Share the output and we'll proceed from there.
