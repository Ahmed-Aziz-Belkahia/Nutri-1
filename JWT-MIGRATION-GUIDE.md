# JWT Authentication Migration Guide

## 📋 Overview

This guide documents the complete migration from Passport.js session-based authentication to JWT (JSON Web Token) based authentication for the Nutri-1 application.

## ✅ Progress Status

### Phase 1: Backend Infrastructure (COMPLETED ✅)
- ✅ Installed dependencies (jsonwebtoken, cookie-parser, helmet)
- ✅ Created `server/utils/jwt.ts` with token utilities
- ✅ Created `server/routes/jwt-auth.ts` with auth endpoints
- ✅ Added database schema for refresh_tokens, api_usage_tracking, user_token_limits
- ✅ Updated `server/index.ts` to use JWT middleware

### Phase 2: Database Migration (COMPLETED ✅)
- ✅ Created force-recreate-db.sh migration script
- ✅ Tested migration on local database
- ✅ Deployed migration to production VPS
- ✅ Verified all JWT tables created (refresh_tokens, api_usage_tracking, user_token_limits)
- ✅ Fixed schema mismatches (daily_calorie_goal, photo_date columns)

### Phase 3: Backend Route Updates (COMPLETED ✅)
- ✅ Replaced ALL 122+ req.isAuthenticated() checks across entire backend
- ✅ Replaced all req.user accesses with typed AuthRequest
- ✅ Updated all protected routes to use `requireAuth` middleware
- ✅ Removed old passport middleware from all route files
- ✅ Fixed req.logout() calls (replaced with JWT token revocation)

### Phase 4: Frontend Implementation (IN PROGRESS �)
- ✅ Updated use-auth.tsx to use JWT endpoints
  - Changed /api/user → /api/auth/me
  - Changed /api/login → /api/auth/login
  - Changed /api/register → /api/auth/register
  - Changed /api/logout → /api/auth/logout
  - Added proper null/undefined handling for hasCompletedOnboarding
- ⏳ Create `client/src/lib/axios-config.ts` with interceptors
- ⏳ Replace remaining fetch() calls with axios instance
- ⏳ Add automatic token refresh logic

### Phase 5: Testing & Cleanup (IN PROGRESS 🔄)
- ✅ Test register flow - WORKING
- ✅ Test login flow - WORKING
- ✅ Test logout flow - WORKING
- ✅ Test protected routes - WORKING
- ✅ Test account deletion - WORKING
- ✅ Test onboarding detection - WORKING (after frontend JWT integration)
- ⏳ Remove old passport/session code
- ⏳ Update package.json to remove passport dependencies

---

## 🗄️ Database Schema Changes

### New Tables Added

#### 1. `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

**Purpose:** Store refresh tokens for long-lived authentication sessions

#### 2. `api_usage_tracking`
```sql
CREATE TABLE api_usage_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  request_date TIMESTAMP NOT NULL DEFAULT (strftime('%s', 'now')),
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  metadata TEXT -- JSON
);
```

**Purpose:** Track OpenAI API usage for rate limiting and billing

#### 3. `user_token_limits`
```sql
CREATE TABLE user_token_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  daily_token_limit INTEGER NOT NULL DEFAULT 10000,
  monthly_token_limit INTEGER NOT NULL DEFAULT 200000,
  daily_used INTEGER NOT NULL DEFAULT 0,
  monthly_used INTEGER NOT NULL DEFAULT 0,
  last_reset_daily TIMESTAMP NOT NULL DEFAULT (strftime('%s', 'now')),
  last_reset_monthly TIMESTAMP NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at TIMESTAMP NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

**Purpose:** Implement token usage limits and premium tiers

---

## 🔐 Authentication Flow

### Old Flow (Passport + Sessions)
```
1. User logs in
2. Passport creates session in memory store
3. Session ID sent in cookie
4. Every request: Server looks up session, deserializes user
5. req.isAuthenticated() checks if session exists
6. req.user populated from session
```

**Problems:**
- Memory store (loses all sessions on restart)
- Not scalable (doesn't work across multiple servers)
- Heavy database lookups on every request
- No token expiration control
- No API usage tracking

### New Flow (JWT)
```
1. User logs in
2. Server generates:
   - Access token (15 min expiry) - stored in HTTP-only cookie
   - Refresh token (7 days expiry) - stored in HTTP-only cookie + database
3. Every request: Server verifies access token signature
4. requireAuth middleware decodes token, attaches user to req
5. When access token expires: Frontend calls /api/auth/refresh
6. Refresh endpoint validates refresh token, issues new access token
```

**Benefits:**
- ✅ Stateless (no session store needed)
- ✅ Scalable (works across multiple servers)
- ✅ Fast (no database lookup on every request)
- ✅ Secure (HTTP-only cookies prevent XSS)
- ✅ Flexible (token expiry, revocation, logout all devices)
- ✅ API usage tracking ready

---

## 🔧 Backend API Changes

### New Auth Endpoints (`/api/auth/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user, returns JWT tokens |
| `/api/auth/login` | POST | Login user, returns JWT tokens |
| `/api/auth/refresh` | POST | Refresh access token using refresh token |
| `/api/auth/logout` | POST | Logout and revoke current refresh token |
| `/api/auth/logout-all` | POST | Logout from all devices (revoke all tokens) |
| `/api/auth/me` | GET | Get current authenticated user |
| `/api/auth/verify` | POST | Verify if access token is valid |
| `/api/auth/forgot-password` | POST | Request password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/verify-email` | GET | Verify email address |

### Migration of Existing Endpoints

**OLD:**
```typescript
app.get("/api/user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json(req.user);
});
```

**NEW:**
```typescript
import { requireAuth, type AuthRequest } from './utils/jwt';

app.get("/api/user", requireAuth, (req: AuthRequest, res) => {
  res.json(req.user);
});
```

**Changes Required in `server/routes.ts`:**
- Add import: `import { requireAuth, type AuthRequest } from './utils/jwt';`
- Replace `(req, res)` with `(req: AuthRequest, res)` for typed routes
- Remove all `if (!req.isAuthenticated())` checks
- Add `requireAuth` middleware to all protected routes

**Example Migration:**

Before:
```typescript
app.post("/api/meal-plans", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const userId = req.user.id;
  // ... rest of logic
});
```

After:
```typescript
app.post("/api/meal-plans", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id; // Non-null assertion safe after requireAuth
  // ... rest of logic
});
```

---

## 💻 Frontend Changes

### New Hook: `use-jwt-auth.tsx`

```typescript
// Features:
- Automatic token refresh (10 minutes interval)
- Axios interceptor for adding Authorization header
- Token storage in HTTP-only cookies (secure)
- Fallback to localStorage for access token
- Automatic retry on 401 errors
```

### Axios Configuration

```typescript
// client/src/lib/axios-config.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send cookies
});

// Request interceptor: Add access token from cookie/localStorage
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401, refresh token
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request
        return axiosInstance(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

### Migration Steps for Frontend

1. **Create new auth hook** (`use-jwt-auth.tsx`)
2. **Create axios config** (`axios-config.ts`)
3. **Update AuthProvider** to use new JWT auth
4. **Replace all fetch() calls:**
   ```typescript
   // OLD
   const response = await fetch('/api/user', {
     credentials: 'include'
   });

   // NEW
   import { axiosInstance } from '@/lib/axios-config';
   const response = await axiosInstance.get('/user');
   ```
5. **Update login/register flows** to handle JWT tokens
6. **Add token refresh timer** (every 10 minutes)
7. **Handle token expiration gracefully**

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] Register new user → Receives JWT tokens
- [ ] Login existing user → Receives JWT tokens
- [ ] Access protected route with valid token → Success
- [ ] Access protected route with expired token → 401
- [ ] Access protected route with invalid token → 401
- [ ] Refresh token with valid refresh token → New access token
- [ ] Refresh token with expired refresh token → 401
- [ ] Logout → Tokens revoked, can't access protected routes
- [ ] Logout all devices → All refresh tokens revoked
- [ ] Password reset flow → Tokens revoked after password change

### Frontend Tests

- [ ] Login → Tokens stored, redirected to dashboard
- [ ] Access dashboard → User info displayed
- [ ] Token refresh (wait 15 min) → Auto-refreshed, no logout
- [ ] Logout → Redirected to login, can't access dashboard
- [ ] Register → Auto-logged in, redirected to onboarding
- [ ] Browser refresh → User still logged in
- [ ] Multiple tabs → Tokens synced across tabs

### Edge Cases

- [ ] Server restart → Users stay logged in (JWT in cookies)
- [ ] Database reset → Refresh tokens invalid, users re-login
- [ ] Concurrent requests → Only one refresh call made
- [ ] Network failure → Graceful error handling
- [ ] XSS attack → HTTP-only cookies prevent token theft
- [ ] CSRF protection → SameSite cookies enabled

---

## 🚀 Deployment Plan

### Step 1: Database Migration (VPS)

```bash
# SSH into VPS
ssh user@146.190.166.34

# Navigate to project
cd /usr/local/lsws/Example/html/Nutri

# Run migration
node migrations/add-jwt-tables.js

# Verify tables created
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table';"
```

### Step 2: Deploy Backend Code

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Restart PM2
pm2 restart myapp

# Check logs
pm2 logs myapp --lines 50
```

### Step 3: Deploy Frontend Code

```bash
# Frontend is bundled with backend, no separate deployment needed
# Just ensure build is up to date
npm run build

# Restart again if needed
pm2 restart myapp
```

### Step 4: Verify Production

```bash
# Test registration
curl -X POST https://yourapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Test login
curl -X POST https://yourapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -c cookies.txt

# Test protected route
curl -X GET https://yourapp.com/api/auth/me \
  -b cookies.txt
```

---

## 🔥 Rollback Plan

If something breaks:

```bash
# 1. Revert to previous commit
git revert HEAD
git push

# 2. Restart PM2
pm2 restart myapp

# 3. Verify old auth working
curl https://yourapp.com/api/user -c cookies.txt

# 4. If database issues, restore backup
sqlite3 local.db < local.db.backup
```

---

## 📚 References

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0 JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

## 🎯 Next Steps

**Immediate Priority:**
1. Create database migration script (`migrations/add-jwt-tables.js`)
2. Run migration on local database
3. Test new auth endpoints with Postman/curl
4. Create frontend JWT auth hook
5. Update one route as proof of concept
6. Test end-to-end flow
7. If successful → Bulk update remaining routes
8. Deploy to production VPS
9. Monitor for issues
10. Remove old passport code after 1 week of stability

**Estimated Timeline:**
- Phase 2 (Migration): 30 minutes
- Phase 3 (Backend Routes): 2 hours
- Phase 4 (Frontend): 3 hours
- Phase 5 (Testing & Cleanup): 1 hour
- **Total: ~6-7 hours**

---

Generated: October 18, 2025
Last Updated: Initial creation
