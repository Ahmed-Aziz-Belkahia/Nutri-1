# NutriAI - AI Functionality Cost Analysis
## OpenAI API Token Usage & Cost Tracking

**Last Updated:** November 3, 2025  
**Model Used:** GPT-4o (primary) / GPT-3.5-turbo (fallback)

---

## 💰 Pricing Reference

### OpenAI API Pricing (Current Rates)

**GPT-4o:**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**GPT-3.5-turbo:**
- Input: $0.50 per 1M tokens
- Output: $1.50 per 1M tokens

---

## 📊 Feature-by-Feature Cost Analysis

### 1. Recipe Generation from Ingredients

**Endpoint:** `/api/analyze-ingredients`

**Input Components:**
- System prompt: ~300 tokens
- Ingredient list: ~100-200 tokens (varies)
- User preferences: ~50 tokens
- **Total Input:** ~450-550 tokens

**Output Components:**
- 3 recipes with full details: ~2,500-3,000 tokens
- Recipe structure (name, description, ingredients, instructions, nutrition)
- **Total Output:** ~2,500-3,000 tokens

**Cost per Request (GPT-4o):**
- Input: 0.00055 × $2.50 = $0.0014
- Output: 0.00275 × $10.00 = $0.0275
- **Total: ~$0.029 per request**

**Cost per Request (GPT-3.5-turbo):**
- Input: 0.00055 × $0.50 = $0.0003
- Output: 0.00275 × $1.50 = $0.0041
- **Total: ~$0.0044 per request**

**Monthly Estimate (100 requests):**
- GPT-4o: $2.90
- GPT-3.5-turbo: $0.44

---

### 2. Meal Plan Generation

**Endpoint:** `/api/meal-plans`

**Input Components:**
- System prompt: ~500 tokens
- User preferences (goals, restrictions): ~200 tokens
- Dietary requirements: ~100 tokens
- **Total Input:** ~800 tokens

**Output Components:**
- 7 days × 3 meals = 21 recipes
- Full meal plan structure: ~8,000-10,000 tokens
- **Total Output:** ~8,000-10,000 tokens

**Cost per Request (GPT-4o):**
- Input: 0.0008 × $2.50 = $0.002
- Output: 0.009 × $10.00 = $0.090
- **Total: ~$0.092 per request**

**Cost per Request (GPT-3.5-turbo):**
- Input: 0.0008 × $0.50 = $0.0004
- Output: 0.009 × $1.50 = $0.0135
- **Total: ~$0.014 per request**

**Monthly Estimate (50 requests):**
- GPT-4o: $4.60
- GPT-3.5-turbo: $0.70

---

### 3. Food Image Analysis

**Endpoint:** `/api/analyze-food`

**Input Components:**
- System prompt: ~200 tokens
- Image (vision API): base64 encoded
- Analysis instructions: ~100 tokens
- **Total Input:** ~300 tokens + image

**Output Components:**
- Food identification: ~150 tokens
- Nutritional breakdown: ~100 tokens
- Confidence scores: ~50 tokens
- **Total Output:** ~300 tokens

**Cost per Request (GPT-4o with Vision):**
- Input: 0.0003 × $2.50 = $0.0008
- Output: 0.0003 × $10.00 = $0.003
- Image processing: ~$0.01 (estimated)
- **Total: ~$0.014 per request**

**Monthly Estimate (200 requests):**
- GPT-4o Vision: $2.80

---

### 4. Body Fat Analysis (Vision API)

**Endpoint:** `/api/analyze-body-fat`

**Input Components:**
- System prompt: ~400 tokens
- Image analysis instructions: ~200 tokens
- Body metrics context: ~100 tokens
- **Total Input:** ~700 tokens + image

**Output Components:**
- Body fat percentage estimate: ~100 tokens
- Body composition analysis: ~200 tokens
- Recommendations: ~300 tokens
- **Total Output:** ~600 tokens

**Cost per Request (GPT-4o with Vision):**
- Input: 0.0007 × $2.50 = $0.0018
- Output: 0.0006 × $10.00 = $0.006
- Image processing: ~$0.01 (estimated)
- **Total: ~$0.018 per request**

**Monthly Estimate (50 requests):**
- GPT-4o Vision: $0.90

---

### 5. Smart Shopping List Generation

**Endpoint:** `/api/shopping-list`

**Input Components:**
- System prompt: ~200 tokens
- Meal plan data: ~500 tokens
- User preferences: ~100 tokens
- **Total Input:** ~800 tokens

**Output Components:**
- Categorized ingredient list: ~400 tokens
- Quantities and units: ~200 tokens
- **Total Output:** ~600 tokens

**Cost per Request (GPT-4o):**
- Input: 0.0008 × $2.50 = $0.002
- Output: 0.0006 × $10.00 = $0.006
- **Total: ~$0.008 per request**

**Cost per Request (GPT-3.5-turbo):**
- Input: 0.0008 × $0.50 = $0.0004
- Output: 0.0006 × $1.50 = $0.0009
- **Total: ~$0.0013 per request**

**Monthly Estimate (50 requests):**
- GPT-4o: $0.40
- GPT-3.5-turbo: $0.065

---

### 6. Recipe Modification/Substitution

**Endpoint:** `/api/modify-recipe`

**Input Components:**
- System prompt: ~200 tokens
- Original recipe: ~500 tokens
- Modification request: ~100 tokens
- **Total Input:** ~800 tokens

**Output Components:**
- Modified recipe: ~800 tokens
- Explanation of changes: ~200 tokens
- **Total Output:** ~1,000 tokens

**Cost per Request (GPT-4o):**
- Input: 0.0008 × $2.50 = $0.002
- Output: 0.001 × $10.00 = $0.010
- **Total: ~$0.012 per request**

**Monthly Estimate (30 requests):**
- GPT-4o: $0.36

---

### 7. Nutrition Advice/Coaching

**Endpoint:** `/api/nutrition-coach`

**Input Components:**
- System prompt: ~400 tokens
- User context (goals, progress): ~300 tokens
- Question: ~100 tokens
- **Total Input:** ~800 tokens

**Output Components:**
- Personalized advice: ~600 tokens
- Action items: ~200 tokens
- **Total Output:** ~800 tokens

**Cost per Request (GPT-4o):**
- Input: 0.0008 × $2.50 = $0.002
- Output: 0.0008 × $10.00 = $0.008
- **Total: ~$0.010 per request**

**Monthly Estimate (100 requests):**
- GPT-4o: $1.00

---

## 📈 Total Monthly Cost Estimates

### Based on Realistic Usage Patterns

**Expected Daily Usage per Active User:**
- Recipe Scan (Ingredients Analysis): 3 times/day
- Food Image Analysis: 1 time/day
- Meal Plan Generation: 1 time/week (4x/month)

### Light User (50% Active Days = 15 days/month)
- Recipe Generation: 15 days × 3 = 45 requests × $0.029 = $1.31
- Meal Plans: 2 requests × $0.092 = $0.18
- Food Analysis: 15 days × 1 = 15 requests × $0.014 = $0.21
- Shopping Lists: 2 requests × $0.008 = $0.02
- **Total per user: ~$1.72/month**

### Regular User (80% Active Days = 24 days/month)
- Recipe Generation: 24 days × 3 = 72 requests × $0.029 = $2.09
- Meal Plans: 4 requests × $0.092 = $0.37
- Food Analysis: 24 days × 1 = 24 requests × $0.014 = $0.34
- Shopping Lists: 4 requests × $0.008 = $0.03
- Body Fat Analysis: 2 requests × $0.018 = $0.04
- **Total per user: ~$2.87/month**

### Power User (100% Active Days = 30 days/month)
- Recipe Generation: 30 days × 3 = 90 requests × $0.029 = $2.61
- Meal Plans: 4 requests × $0.092 = $0.37
- Food Analysis: 30 days × 1 = 30 requests × $0.014 = $0.42
- Shopping Lists: 4 requests × $0.008 = $0.03
- Body Fat Analysis: 4 requests × $0.018 = $0.07
- Nutrition Coaching: 15 requests × $0.010 = $0.15
- Recipe Modifications: 10 requests × $0.012 = $0.12
- **Total per user: ~$3.77/month**

### Enterprise/Team User (Multiple daily scans)
- Recipe Generation: 30 days × 5 = 150 requests × $0.029 = $4.35
- Meal Plans: 8 requests × $0.092 = $0.74
- Food Analysis: 30 days × 2 = 60 requests × $0.014 = $0.84
- Shopping Lists: 8 requests × $0.008 = $0.06
- Body Fat Analysis: 8 requests × $0.018 = $0.14
- Nutrition Coaching: 30 requests × $0.010 = $0.30
- Recipe Modifications: 20 requests × $0.012 = $0.24
- **Total per user: ~$6.67/month**

---

## 🎯 Cost Optimization Strategies

### 1. Model Selection
- Use GPT-3.5-turbo for simpler tasks (shopping lists, simple recipes)
- Reserve GPT-4o for complex tasks (meal plans, detailed analysis)
- **Potential savings: 50-70% on eligible requests**

### 2. Token Reduction
- Optimize system prompts (reduce unnecessary context)
- Use structured output formats (JSON) to reduce token count
- Cache common responses
- **Potential savings: 20-30% on all requests**

### 3. Rate Limiting
- Implement per-user daily/weekly limits.
- Free tier: 10 requests/day
- Premium tier: Unlimited
- **Cost control: Predictable user costs**

### 4. Response Caching
- Cache common recipe requests
- Store frequently generated meal plans
- Reuse similar food analysis results
- **Potential savings: 30-40% reduction in API calls**

### 5. Batch Processing
- Combine multiple recipe requests into one API call
- Generate multiple meal options in single request
- **Potential savings: 15-25% per combined request**

---

## 💡 Pricing Tiers for Users

### Free Tier (Beta/Trial)
**Allowance:**
- 3 recipe scans per day
- 1 food analysis per day
- 1 meal plan per month
- No coaching or modifications

**Cost to us (if used daily):**
- Daily: 3 × $0.029 + 1 × $0.014 = $0.101/day
- Monthly (30 days): $3.03 + 1 meal plan ($0.092) = **$3.12/month**

**Strategy:** Limited free tier to demonstrate core value, encourage upgrade

---

### Basic Tier ($4.99/month)
**Allowance:**
- 5 recipe scans per day
- 2 food analyses per day  
- 2 meal plans per month
- 1 shopping list per week
- Access to recipe library

**Expected Usage (Regular User - 24 active days):**
- Recipe scans: 24 × 3 = 72 requests × $0.029 = $2.09
- Food analysis: 24 × 1 = 24 requests × $0.014 = $0.34
- Meal plans: 2 × $0.092 = $0.18
- Shopping lists: 4 × $0.008 = $0.03
- **Cost to us: ~$2.64/month**
- **Margin: +$2.35/month (47% margin) ✅**

**Strategy:** Affordable entry point with healthy margin

---

### Premium Tier ($9.99/month)
**Allowance:**
- Unlimited recipe scans
- Unlimited food analyses
- 4 meal plans per month
- Unlimited shopping lists
- Body fat analysis (4x/month)
- Basic nutrition coaching (10 questions/month)

**Expected Usage (Power User - 30 active days):**
- Recipe scans: 30 × 3 = 90 requests × $0.029 = $2.61
- Food analysis: 30 × 1 = 30 requests × $0.014 = $0.42
- Meal plans: 4 × $0.092 = $0.37
- Shopping lists: 4 × $0.008 = $0.03
- Body fat: 4 × $0.018 = $0.07
- Coaching: 10 × $0.010 = $0.10
- **Cost to us: ~$3.60/month**
- **Margin: +$6.39/month (64% margin) ✅**

**Strategy:** Best value tier with strong margins, target most users here

---

### Pro Tier ($19.99/month)
**Allowance:**
- Everything in Premium
- Unlimited meal plans
- Unlimited body fat analysis
- Unlimited nutrition coaching
- Recipe modifications (20x/month)
- Priority support
- Advanced analytics

**Expected Usage (Heavy User - 30 active days + coaching):**
- Recipe scans: 30 × 5 = 150 requests × $0.029 = $4.35
- Food analysis: 30 × 2 = 60 requests × $0.014 = $0.84
- Meal plans: 8 × $0.092 = $0.74
- Shopping lists: 8 × $0.008 = $0.06
- Body fat: 8 × $0.018 = $0.14
- Coaching: 30 × $0.010 = $0.30
- Modifications: 20 × $0.012 = $0.24
- **Cost to us: ~$6.67/month**
- **Margin: +$13.32/month (67% margin) ✅**

**Strategy:** Premium tier for serious users with excellent margins

---

### Team/Enterprise Tier ($49.99/month for 3 users)
**Allowance:**
- All Pro features per user
- Shared meal plans
- Team analytics
- Dedicated support
- Custom integrations

**Expected Usage (3 power users):**
- Cost per user: $6.67
- Total cost: 3 × $6.67 = **$20.01/month**
- **Margin: +$29.98/month (60% margin) ✅**

**Strategy:** Team collaboration features with volume pricing

---

## 🔍 Monitoring & Analytics

### Track per User:
- Total API calls per day/week/month
- Cost per user per billing cycle
- Feature usage breakdown
- Token consumption patterns

### Track per Feature:
- Average tokens per request
- Success rate
- Response time
- Cost per successful request

### Alerts:
- User exceeding expected usage (potential abuse)
- Feature costs exceeding estimates
- API errors causing wasted tokens
- Unusual token consumption patterns

---

## 📊 Current Implementation

### Database Tracking
Table: `api_usage_tracking`
- `user_id` - Track per user
- `endpoint` - Which feature
- `tokens_used` - OpenAI tokens consumed
- `cost_usd` - Estimated cost
- `request_timestamp` - When
- `response_time_ms` - Performance
- `status_code` - Success/failure
- `error_message` - Debug info

### Token Limits (Current Implementation)
- Daily limit: 100,000 tokens per user
- Weekly limit: 500,000 tokens per user
- Resets: Midnight UTC daily

---

## 🚀 Recommendations

### Immediate Actions:
1. ✅ Enable detailed usage tracking
2. ✅ Implement per-feature cost logging
3. ⏳ Set up user-facing usage dashboard
4. ⏳ Implement tiered rate limits
5. ⏳ Add usage alerts for admins

### Short-term (1-2 months):
1. Optimize prompts for token efficiency
2. Implement response caching
3. A/B test GPT-3.5 vs GPT-4o for specific features
4. Analyze actual usage patterns vs estimates
5. Adjust pricing tiers based on real data

### Long-term (3-6 months):
1. Consider fine-tuned models for specific tasks
2. Explore alternative AI providers for cost comparison
3. Build hybrid system (cache + AI)
4. Implement smart model selection based on request complexity
5. Develop in-house nutrition database to reduce AI dependency

---

## 📝 Notes

- All costs are estimates based on typical usage patterns
- Actual costs may vary based on prompt engineering and response length
- Vision API costs are approximate and may change with OpenAI pricing
- Token counting includes both input and output
- Real-world usage should be monitored to validate these estimates
