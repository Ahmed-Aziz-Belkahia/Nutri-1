# Token Usage Tracking Implementation

## Overview
Comprehensive token usage tracking has been implemented across all AI functionalities to monitor OpenAI API costs and usage patterns. All tracked data is stored in the `apiUsageTracking` database table and displayed in the analytics dashboard.

## Implementation Details

### Centralized Tracking Utility
**File:** `server/utils/token-tracker.ts`

**Features:**
- Automatic cost calculation based on model pricing
- Support for multiple OpenAI models (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo)
- Response time tracking
- Error tracking for failed requests
- Wrapper function for automatic tracking

**Pricing (as of 2024):**
- gpt-4o: $2.50 per 1M input tokens, $10.00 per 1M output tokens
- gpt-4o-mini: $0.150 per 1M input tokens, $0.600 per 1M output tokens
- gpt-4-turbo: $10.00 per 1M input tokens, $30.00 per 1M output tokens
- gpt-4: $30.00 per 1M input tokens, $60.00 per 1M output tokens
- gpt-3.5-turbo: $0.50 per 1M input tokens, $1.50 per 1M output tokens

### Tracked Services and Endpoints

#### 1. Recipe Generation Service
**File:** `server/services/recipe-generation.ts`
**Function:** `generateRecipe(ingredients, preferences, customPrompt, userId)`
**Endpoint Tracked:** `/api/recipes/generate`
**Model:** gpt-4o
**Usage:** Generates 2 recipes based on ingredients and preferences

#### 2. Food Recognition Service
**File:** `server/services/food-recognition.ts`

**Functions:**
- `analyzeFoodImage(imageBase64, userId)` → `/api/food-recognition/image`
- `analyzeFoodText(foodDescription, userId)` → `/api/food-recognition/text` 
- `analyzeIngredientsWithOpenAI(imageBase64, userId)` → `/api/ingredients/analyze`
- `generateRecipeSuggestions(ingredients, userId)` → `/api/recipes/suggestions`

**Model:** gpt-4o
**Usage:** Vision API for food image analysis, text analysis for nutrition data

#### 3. Body Analysis Service
**File:** `server/services/body-analysis.ts`
**Function:** `analyzeBodyComposition(imageBase64, weight, height, gender, age, userId)`
**Endpoint Tracked:** `/api/body-analysis`
**Model:** gpt-4o
**Usage:** Vision API for body fat percentage estimation

#### 4. OpenAI Service (Core Functions)
**File:** `server/services/openai.ts`

**Functions:**
- `recognizeFoodFromImage(base64Image, userId)` → `/api/food-recognition/image`
- `analyzeFoodText(foodDescription, userId)` → `/api/food-recognition/text`
- `analyzeNutrition(foodItems, userId)` → `/api/nutrition-analysis`
- `generateMealPlan(preferences, userId)` → `/api/meal-plans/generate`
- `generateMealPlanWithRecipes(preferences, userId)` → `/api/meal-plans/with-recipes`
- `generateMonthlyMealPlan(preferences, userId)` → `/api/meal-plans/monthly-batch-{N}`
- `suggestRecipe(ingredients, userId)` → `/api/recipes/suggest`

**Model:** gpt-4o
**Usage:** Various nutrition and meal planning functions

#### 5. Shopping List Generator Service
**File:** `server/services/shopping-list-generator.ts`
**Function:** `generateWeeklyShoppingList(mealPlanIds, userId, trackTokens)`
**Endpoint Tracked:** `/api/shopping-list/generate`
**Model:** gpt-4o-mini (cheaper model for simple tasks)
**Usage:** Consolidates ingredients from multiple meal plans

### Database Schema

**Table:** `apiUsageTracking`

```typescript
{
  id: integer (auto-increment primary key),
  userId: integer (foreign key to users),
  endpoint: text (e.g., "/api/meal-plans/generate"),
  tokensUsed: integer (total tokens consumed),
  costUsd: real (calculated cost in USD),
  requestDate: integer (Unix timestamp in seconds),
  model: text (e.g., "gpt-4o", "gpt-4o-mini"),
  status: text ("success", "error", "rate_limited"),
  metadata: JSON {
    promptTokens: integer,
    completionTokens: integer,
    totalTokens: integer,
    responseTime: integer (milliseconds, optional),
    errorMessage: string (optional)
  }
}
```

## Usage in Route Handlers

### Example: Adding userId to AI function calls

**Before:**
```typescript
const analysis = await analyzeFoodImage(base64Image);
```

**After:**
```typescript
const analysis = await analyzeFoodImage(base64Image, req.user.id);
```

### Example: Route Handler Pattern

```typescript
router.post('/api/analyze-food', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageData } = req.body;
    
    // Function automatically tracks token usage
    const result = await analyzeFoodImage(imageData, userId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Analytics Dashboard Integration

The tracked data is displayed in the Admin Analytics dashboard (`/admin/analytics`):

### Metrics Displayed:
1. **Total Tokens Used** - Lifetime token consumption
2. **Total API Cost** - Cumulative spending in USD
3. **Token Usage Over Time** - Line chart showing daily usage
4. **API Cost Breakdown** - Bar chart by endpoint
5. **Model Distribution** - Pie chart of model usage
6. **Top Endpoints** - Table of most-used API endpoints
7. **Top Users** - Ranking by token consumption

### API Endpoints for Analytics:
- `GET /api/admin/analytics/tokens?range=7d|30d|90d` - Token usage statistics
- `GET /api/admin/analytics/api?range=7d|30d|90d` - API endpoint breakdown
- `GET /api/admin/analytics/activity?range=7d|30d|90d` - Daily activity data

## Testing Token Tracking

### 1. Check Database Records
```sql
SELECT * FROM api_usage_tracking 
WHERE userId = <your_user_id> 
ORDER BY requestDate DESC 
LIMIT 10;
```

### 2. Check Console Logs
Look for messages like:
```
[Token Tracking] Tracked 1523 tokens for user 5 on /api/meal-plans/generate (Cost: $0.0076)
```

### 3. View Analytics Dashboard
Navigate to `/admin/analytics` to see aggregated statistics and charts.

## Cost Monitoring

### Average Costs Per Operation:
- Food image recognition: ~$0.005 - $0.015 per image
- Recipe generation: ~$0.01 - $0.03 per request
- Meal plan generation: ~$0.02 - $0.05 per plan
- Body analysis: ~$0.01 - $0.02 per analysis
- Shopping list consolidation: ~$0.001 - $0.003 (uses gpt-4o-mini)

### Monthly Estimates (for 100 active users):
- Food logging (5x/day): ~$75 - $225/month
- Recipe generation (2x/week): ~$16 - $48/month
- Meal planning (1x/week): ~$16 - $40/month
- Body tracking (1x/week): ~$8 - $16/month
- **Total Estimated:** $115 - $329/month

## Error Handling

### Failed Requests
Failed API calls are tracked with status "error" and $0 cost:
```typescript
await trackFailedRequest(
  userId,
  '/api/endpoint',
  'gpt-4o',
  'API rate limit exceeded'
);
```

### Graceful Degradation
If tracking fails, it logs the error but doesn't break the main functionality:
```typescript
try {
  await trackOpenAIUsage(...);
} catch (error) {
  console.error('[Token Tracking] Error:', error);
  // Main function continues normally
}
```

## Future Enhancements

### Potential Additions:
1. **Rate Limiting** - Automatic throttling based on user tier
2. **Budget Alerts** - Email notifications when usage exceeds thresholds
3. **User Quotas** - Per-user daily/monthly token limits
4. **Cost Optimization** - Automatic model selection (gpt-4o-mini for simple tasks)
5. **Caching** - Store common responses to reduce API calls
6. **Batch Processing** - Group multiple requests to reduce costs

### Admin Features:
1. **Cost Reports** - Generate monthly cost breakdowns by user/endpoint
2. **Usage Trends** - Historical analysis and forecasting
3. **User Tier Management** - Different token limits per subscription level
4. **API Health Dashboard** - Monitor success rates, latency, errors

## Files Modified

### New Files:
- `server/utils/token-tracker.ts` - Centralized tracking utility

### Modified Files:
- `server/services/recipe-generation.ts` - Added userId parameter and tracking
- `server/services/food-recognition.ts` - Added userId parameter and tracking (4 functions)
- `server/services/body-analysis.ts` - Added userId parameter and tracking
- `server/services/openai.ts` - Updated 7 functions with tracking
- `server/services/shopping-list-generator.ts` - Added tracking to AI consolidation

## Deployment Checklist

- [x] Create centralized token tracker utility
- [x] Update all AI service functions with userId parameter
- [x] Add tracking calls after OpenAI API requests
- [x] Test locally with console logging
- [ ] Update route handlers to pass userId to AI functions
- [ ] Test analytics dashboard with real data
- [ ] Deploy to VPS
- [ ] Monitor costs in production
- [ ] Set up alerts for unusual usage patterns

## Notes

- Token tracking is **backward compatible** - existing code without userId will still work (tracking just won't happen)
- All tracking is **asynchronous** and won't block the main request
- Failed tracking attempts are **logged but don't throw errors**
- The system automatically calculates costs based on current OpenAI pricing
- Monthly meal plan generation tracks each batch separately for better granularity
