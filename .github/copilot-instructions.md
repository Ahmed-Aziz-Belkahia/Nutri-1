# NutriAI Copilot Instructions

> AI-powered nutrition tracking app with food scanning, recipe generation, meal planning, body analysis, and coaching.

---

## Architecture Overview

| Layer | Tech Stack | Location |
|-------|------------|----------|
| **Frontend** | React 18 + TypeScript + Vite + Wouter | `client/src/` |
| **Backend** | Express.js + TypeScript | `server/` |
| **Database** | SQLite + Drizzle ORM + Zod | `db/` → `local.db` |
| **Mobile** | React Native (Expo 54) WebView | `mobile/` → `https://app.nutriai.online` |
| **AI** | OpenAI GPT-4o | `server/services/` |
| **Production** | PM2 + nginx | `ecosystem.config.js` |

---

## Key Commands

```bash
npm run dev          # Start dev server (tsx server/index.ts + Vite HMR)
npm run build        # Build for production (Vite + esbuild)
npm run start        # Production server (NODE_ENV=production node dist/index.js)
npm run db:push      # Push schema changes (drizzle-kit push --force)
npm run db:recreate  # Recreate database from schema
npm run check        # TypeScript type checking
```

---

## Path Aliases

Defined in `tsconfig.json` and `vite.config.ts`:

| Alias | Maps To |
|-------|---------|
| `@/*` | `client/src/*` |
| `@db` | `db/index.ts` |
| `@db/*` | `db/*` |

---

## Authentication System

### JWT Token Flow
- **Access Token**: 1 day expiry, stored in httpOnly cookie `token`
- **Refresh Token**: 365 days expiry, stored in httpOnly cookie `refreshToken`
- **Auto-refresh**: Frontend refreshes every 20 hours via interval

### Middleware (`server/utils/jwt.ts`)

| Function | Purpose |
|----------|---------|
| `requireAuth` | Protects routes; sets `req.user` with `{ id, email }` |
| `optionalAuth` | Same but doesn't fail on missing token |
| `generateAccessToken(userId, email)` | Creates 1-day access token |
| `generateRefreshToken(userId, email)` | Creates 365-day refresh token |

```typescript
import { requireAuth, AuthRequest } from "./utils/jwt";

app.get("/api/data", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  // ...
});
```

### Registration Flow (`server/routes/jwt-auth.ts`)
1. User submits email → 6-digit verification code sent via SendGrid
2. User verifies code → `pending_registrations` entry created
3. User completes registration → Account created in `users` table
4. Rate limiting: 3 registrations/15min, 5 verifications/15min, 10 logins/15min

---

## Frontend Data Fetching

### TanStack Query Architecture

**Query Keys** (`client/src/lib/queryKeys.ts`):
```typescript
export const queryKeys = {
  user: { current: () => ['user'] },
  foodLogs: { 
    byDate: (date: string) => ['foodLogs', date],
    dailyTotals: (date: string) => ['dailyTotals', date],
  },
  recipes: { all: () => ['recipes'] },
  mealPlans: { 
    today: () => ['mealPlans', 'today'],
    byDate: (date: string) => ['mealPlans', date],
  },
  // ... shopping, progress, admin
};
```

**Cache Presets** (`client/src/lib/queryOptions.ts`):

| Preset | staleTime | gcTime | Use Case |
|--------|-----------|--------|----------|
| `static` | 30 min | 60 min | User profile, settings |
| `moderate` | 5 min | 30 min | Recipes, meal plans |
| `dynamic` | 1 min | 5 min | Food logs, progress |
| `realtime` | 0 | 5 min | Active tracking |

**Custom Hooks** (`client/src/hooks/queries/`):
```typescript
import { useFoodLogsByDate, useDailyTotals } from "@/hooks/queries/useFoodLogs";
import { useTodaysMealPlan, useCreateMealPlan } from "@/hooks/queries/useMealPlans";
```

---

## Database Schema

### Core Tables (`db/schema.ts`)

| Table | Purpose |
|-------|---------|
| `users` | Auth, profile, onboarding, Google OAuth fields |
| `pendingRegistrations` | Email verification before account creation |
| `foodLogs` | Unified meal/recipe model with nutrition data |
| `userNutritionPreferences` | Calorie goals, macros, dietary restrictions |
| `userDietaryPreferences` | Allergies, dislikes, cuisine preferences |
| `weightLogs` | Weight tracking over time |
| `progressPhotos` | Body progress photos with AI analysis |
| `recipes` | Community/personal recipe library |
| `recipeLikes` / `recipeComments` | Social features |
| `mealPlans` | Weekly/daily meal planning |
| `recipesInMealPlan` | Junction table with completion tracking |
| `shoppingListItems` | Generated shopping lists |
| `badges` / `userBadges` | Gamification system |
| `dailyProgress` | Daily streaks and achievements |
| `notifications` | In-app notifications |
| `refreshTokens` | JWT refresh token storage |
| `apiUsageTracking` | AI token usage per endpoint |
| `userTokenLimits` | Free tier: 10,000 tokens/day |

### Schema Patterns

**JSON Columns**:
```typescript
tags: text("tags", { mode: 'json' }).$type<string[]>()
```

**Timestamps** (Unix mode):
```typescript
created_at: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
```

**Zod Validation**:
```typescript
export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
```

---

## AI Services

### Token Quota System (`server/services/token-limit.service.ts`)

- **Free Tier**: 10,000 tokens/day
- **Reset**: Daily at midnight UTC
- **Tracking**: Per-user, per-endpoint

```typescript
import { checkTokenLimit } from "./services/token-limit.service";

app.post("/api/analyze-food", requireAuth, checkTokenLimit('food-analysis'), async (req, res) => {
  // AI operation here
});
```

### Service Functions (`server/services/`)

| Service | Functions |
|---------|-----------|
| `openai.ts` | `analyzeFood()`, `generateRecipe()`, `createMealPlan()` |
| `food-recognition.ts` | `analyzeFoodImage()` with allergen warnings |
| `body-analysis.ts` | `analyzeBodyComposition()` from photos |
| `ai-coach.ts` | Conversational nutrition coaching |

---

## i18n (Internationalization)

### Configuration (`client/src/i18n/config.ts`)

**Languages**: `en`, `ar`, `fr`, `es`, `pl`

**Namespaces** (8 total):
- `common`, `auth`, `dashboard`, `profile`
- `meals`, `onboarding`, `recipes`, `analytics`

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation(['common', 'dashboard']);
t('common:save')
t('dashboard:todaysMeals')
```

**Locale Files**: `client/src/i18n/locales/{lang}/{namespace}.json`

---

## Design System

### Glassmorphism Theme

**CSS Variables** (`client/src/styles/design-tokens.css`):
- Primary: `#26a8ff`
- Card BG: `rgba(255, 255, 255, 0.6)` with `backdrop-blur: 15.7px`
- Grid: 8px spacing system
- Radius: `--radius` CSS variable

### Tailwind Configuration (`tailwind.config.ts`)

- Dark mode: Class-based (`darkMode: ["class"]`)
- Custom colors: `quiz.*`, `chart.*`, `sidebar.*`
- Animations: `accordion-down`, `accordion-up`, `blob`
- Plugins: `tailwindcss-animate`, `@tailwindcss/typography`

### Component Library

- Base: Radix UI primitives
- Pattern: shadcn/ui in `client/src/components/ui/`
- Icons: Lucide React, Heroicons, React Icons

---

## Routing (Frontend)

### Wouter (NOT React Router)

```typescript
import { Route, Switch, useLocation } from "wouter";

// In App.tsx
<Switch>
  <Route path="/" component={HomePage} />
  <ProtectedRoute path="/dashboard" component={Dashboard} />
  <AdminProtectedRoute path="/admin" component={AdminDashboard} />
</Switch>
```

### Route Protection (`client/src/lib/protected-route.tsx`)

```typescript
import { ProtectedRoute } from "@/lib/protected-route";

// Redirects to /auth if unauthenticated
<ProtectedRoute path="/dashboard" component={Dashboard} />

// AdminProtectedRoute checks user.isAdmin
<AdminProtectedRoute path="/admin" component={AdminDashboard} />
```

---

## Mobile App (`mobile/`)

### Expo WebView Wrapper

- **Target**: `https://app.nutriai.online`
- **SDK**: Expo 54, React Native 0.81
- **Features**:
  - Android back button handling
  - Network connectivity detection
  - Splash screen management
  - Cookie sharing for auth
  - Camera access bridge

```typescript
// Injected JS sets window.isNativeApp = true
// Web app can detect mobile context
```

### Key Dependencies
```json
{
  "expo": "~54.0.27",
  "react-native-webview": "13.15.0",
  "@react-native-community/netinfo": "11.4.1",
  "expo-camera": "~17.0.10"
}
```

---

## Server Configuration

### Express Setup (`server/index.ts`)

| Setting | Value |
|---------|-------|
| Body limit | 50 MB |
| Request timeout | 2 minutes |
| CORS | Credentials enabled |
| Security | Helmet with custom CSP |
| Cookies | cookie-parser with httpOnly |

### Production (`ecosystem.config.js`)

```javascript
{
  name: "nutriapp",
  script: "./dist/index.js",
  instances: 1,
  max_memory_restart: "1G",
  env: { NODE_ENV: "production", PORT: 5000 }
}
```

---

## Component Organization

```
client/src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── layouts/         # BaseLayout.tsx, etc.
│   ├── dashboard/       # Dashboard widgets
│   └── [feature]/       # Feature-specific components
├── pages/               # Route components
├── hooks/
│   ├── queries/         # TanStack Query hooks
│   └── use-*.tsx        # Custom hooks
├── lib/                 # Utilities, queryClient, queryKeys
├── i18n/                # Translations
└── styles/              # CSS design system
```

---

## Adding New Features

### New API Endpoint

1. Add route in `server/routes.ts`:
   ```typescript
   app.post("/api/feature", requireAuth, async (req: AuthRequest, res) => {});
   ```

2. Add schema/types in `db/schema.ts` if needed

3. Create query hook in `client/src/hooks/queries/useFeature.ts`:
   ```typescript
   export function useFeature() {
     return useQuery({
       queryKey: queryKeys.feature.all(),
       queryFn: () => fetch('/api/feature').then(r => r.json()),
       ...queryOptions.moderate,
     });
   }
   ```

4. Add query key to `client/src/lib/queryKeys.ts`

### New AI Feature

1. Add service function in `server/services/openai.ts`
2. Create endpoint with `checkTokenLimit` middleware
3. Add frontend hook with loading/error states
4. Update token tracking in `apiUsageTracking` table

---

## Common Gotchas

| Issue | Solution |
|-------|----------|
| Database uses snake_case, frontend camelCase | Transform in `use-auth.tsx` pattern |
| All API routes | Prefix with `/api/` |
| Image uploads | Multer with 50MB limit, stored in `uploads/` |
| Mobile testing | Test web version at `http://localhost:5000` |
| Date handling | Use `date-fns` for formatting/parsing |
| Toast notifications | Use `react-hot-toast` (already configured) |
| Form validation | Use `react-hook-form` + `zod` |

---

## Environment Variables

Required in production:
- `NODE_ENV` – Set to `production`
- `PORT` – Server port (default: `5000`)
- `JWT_SECRET` – Token signing secret (CHANGE IN PRODUCTION!)
- `OPENAI_API_KEY` – GPT-4o access
- `SENDGRID_API_KEY` – Email verification
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – OAuth

---

## Deployment

### VPS Infrastructure

| Setting | Value |
|---------|-------|
| **Primary VPS** | `72.61.182.248` (OpenLiteSpeed) |
| **Domain** | `app.nutriai.online` |
| **App Directory** | `/usr/local/lsws/Example/html/NutriApp` |
| **App Port** | `5000` (proxied via OpenLiteSpeed on 80/443) |
| **Process Manager** | PM2 (`myapp` or `nutriapp`) |
| **Database** | SQLite at `local.db` |
| **OS** | Ubuntu with OpenLiteSpeed |

### Quick Deployment Commands

```bash
# SSH into VPS
ssh root@72.61.182.248

# Navigate to project
cd /usr/local/lsws/Example/html/NutriApp

# Quick deploy (one-liner)
git pull && npm install && npm run build && pm2 restart myapp

# OR use the comprehensive script
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `deploy-complete.sh` | Full deployment with backup, health check, migrations, permissions |
| `quick-deploy.sh` | Fast deploy: pull, install, build, restart |
| `deploy-vps.sh` | Initial VPS setup with Node.js, PM2 installation |
| `deploy-openlitespeed.sh` | Complete OpenLiteSpeed server setup |

### deploy-complete.sh Flow

1. **Backup** – Creates timestamped backup of `local.db`
2. **Health Check** – SQLite integrity check, moves corrupt files
3. **Dependencies** – Runs `npm install` if needed
4. **Schema Check** – Validates Drizzle schema, regenerates if mismatched
5. **Permissions** – Sets `664` for database, `775` for directory
6. **PM2 Restart** – Restarts app and saves PM2 state

### PM2 Commands

```bash
pm2 status                    # Check app status
pm2 logs myapp --lines 50     # View logs
pm2 restart myapp             # Restart app
pm2 save                      # Save PM2 state
pm2 startup systemd           # Enable auto-start on boot
```

### OpenLiteSpeed Proxy Configuration

OpenLiteSpeed proxies requests to Node.js:
```apache
context / {
  type                    proxy
  handler                 nodejs
  addDefaultCharset       off
}

rewrite {
  rules <<<END_rules
RewriteCond %{HTTP:Upgrade} =websocket
RewriteRule /(.*)         ws://localhost:5000/$1 [proxy,last]
RewriteCond %{HTTP:Upgrade} !=websocket
RewriteRule /(.*)         http://localhost:5000/$1 [proxy,last]
  END_rules
}
```

### Database Migrations on Deploy

The deployment script checks for critical columns:
- `recipes_in_meal_plan.order` (not `order_num`)
- `recipes_in_meal_plan.is_completed`, `completed_at`
- `user_nutrition_preferences.daily_calorie_goal`
- `food_logs` recipe fields

If mismatched, runs `generate-db-from-drizzle.js` to recreate schema.

### Troubleshooting Deployment

| Issue | Solution |
|-------|----------|
| PM2 shows "errored" | `pm2 logs myapp --err --lines 50` |
| Port 5000 not listening | `netstat -tlnp \| grep 5000` then `pm2 restart myapp` |
| "no such column" errors | Run migration scripts or `npm run db:push` |
| Database corrupted | `sqlite3 local.db "PRAGMA integrity_check;"` |
| Permission denied | `chmod 664 local.db && chmod 775 .` |

### Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall (open port 5000 internally)
- [ ] Set up SSL certificate via OpenLiteSpeed
- [ ] Enable PM2 startup script (`pm2 startup`)
- [ ] Set up database backups (cron job recommended)
- [ ] Configure log rotation

### Deployment Documentation Files

| File | Description |
|------|-------------|
| `DEPLOYMENT-GUIDE.md` | Quick deployment reference |
| `VPS-DEPLOYMENT-GUIDE.md` | Detailed JWT migration steps |
| `VPS-DEPLOYMENT-CHECKLIST.md` | Step-by-step checklist |
| `DEPLOYMENT-OPENLITESPEED.md` | OpenLiteSpeed-specific setup |
| `DEPLOYMENT-STATUS.md` | Current VPS status and fixes |

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Components | PascalCase | `MealCard.tsx` |
| Hooks | camelCase with `use` prefix | `useFoodLogs.ts` |
| Utils | camelCase | `queryKeys.ts` |
| Routes | kebab-case | `meal-plans.routes.ts` |
| Schemas | camelCase | `schema.ts` |
| Translations | lowercase | `common.json` |
