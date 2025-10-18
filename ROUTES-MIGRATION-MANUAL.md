# JWT Migration Guide for server/routes.ts

## Step 1: Update Imports (Top of File)

### Remove these lines:
```typescript
import { setupAuth } from "./auth";
import { isAuthenticated } from "./middleware/auth";
```

### Add these imports after `import type { Express }`:
```typescript
import type { Request, Response, NextFunction } from "express";
import { requireAuth, optionalAuth, type AuthRequest } from "./utils/jwt";
```

## Step 2: Route Conversion Patterns

### Pattern A: Simple Protected Route

**BEFORE:**
```typescript
app.post("/api/some-endpoint", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const userId = req.user.id;
  // ... rest of code
});
```

**AFTER:**
```typescript
app.post("/api/some-endpoint", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;  // Non-null assertion (safe after requireAuth)
  // ... rest of code (remove the if check)
});
```

### Pattern B: Optional Authentication

**BEFORE:**
```typescript
app.get("/api/recipes", async (req, res) => {
  const userId = req.isAuthenticated() ? req.user.id : null;
  // ... code that works with or without auth
});
```

**AFTER:**
```typescript
app.get("/api/recipes", optionalAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || null;  // Optional chaining
  // ... code that works with or without auth
});
```

## Step 3: Routes to Update (in order)

Run this command to see all routes that need updating:
```bash
grep -n "req.isAuthenticated()" server/routes.ts | wc -l
```

### Priority 1 - Critical User Routes:
- `/api/register/complete-onboarding` (line ~103)
- `/api/user` (line ~210)  
- `/api/user/nutrition-preferences` (line ~279)
- `/api/user/dietary-preferences` (line ~333)

### Priority 2 - Food & Meal Planning:
- `/api/recipes/*` (multiple endpoints)
- `/api/food-logs/*` (multiple endpoints)
- `/api/meal-plans/*` (multiple endpoints)

### Priority 3 - Progress & Photos:
- `/api/progress-photos/*` (multiple endpoints)
- `/api/weight-logs/*` (if any)

### Priority 4 - Gamification:
- `/api/badges` (line ~1466)
- `/api/notifications` (line ~1497)

## Step 4: Testing After Changes

After each batch of changes, test these endpoints:

```bash
# 1. Test login still works
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}' \
  -c cookies.txt

# 2. Test a protected endpoint
curl -X GET http://localhost:5000/api/user \
  -b cookies.txt

# 3. Test without auth (should get 401)
curl -X GET http://localhost:5000/api/user
```

## Step 5: Automated Helper Script

Run this to find all instances:
```bash
node find-auth-patterns.mjs
```

This will generate a report of:
- All `req.isAuthenticated()` locations
- All `req.user` accesses
- Suggested changes for each

## Quick Reference Card

| Old Pattern | New Pattern |
|------------|-------------|
| `async (req, res) =>` | `requireAuth, async (req: AuthRequest, res: Response) =>` |
| `if (!req.isAuthenticated())` | ❌ **Remove** (handled by middleware) |
| `req.user.id` | `req.user!.id` |
| `req.user?.email` | `req.user!.email` |

## Rollback Instructions

If anything breaks:
```bash
git checkout server/routes.ts
pm2 restart myapp
```

## Estimated Time

- Full migration: 2-3 hours
- Testing: 30-60 minutes
- Total: 3-4 hours

We can do this in batches of 10-15 routes at a time!
