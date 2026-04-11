# VPS Deployment Guide - JWT Authentication Migration

## 📋 Pre-Deployment Checklist

- ✅ Code committed and pushed to GitHub (commit: 29310fa)
- ✅ JWT authentication system implemented
- ✅ Database schema updated with new tables
- ✅ Migration script created
- ✅ All tests passing locally

## 🚀 Deployment Steps

### Step 1: SSH into VPS

```bash
ssh root@146.190.166.34
# Or: ssh user@146.190.166.34
```

### Step 2: Navigate to Project Directory

```bash
cd /usr/local/lsws/Example/html/Nutri
pwd  # Verify you're in the right directory
```

### Step 3: Create Backup Directory

```bash
mkdir -p backups
ls -la backups  # Verify directory created
```

### Step 4: Backup Current Database

```bash
# Check if database exists
ls -lh local.db

# Create timestamped backup
cp local.db backups/local.db.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh backups/
```

**Expected Output:**
```
-rw-r--r-- 1 root root 2.3M Oct 18 02:30 local.db.backup.20251018_023000
```

### Step 5: Stop PM2 Application

```bash
pm2 stop myapp

# Verify it's stopped
pm2 status
```

**Expected Output:**
```
┌─────┬──────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name     │ status  │ cpu     │ memory  │ uptime   │
├─────┼──────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ myapp    │ stopped │ 0%      │ 0 B     │ 0        │
└─────┴──────────┴─────────┴─────────┴─────────┴──────────┘
```

### Step 6: Pull Latest Code

```bash
# Stash any local changes
git stash

# Pull latest code
git pull origin main

# Verify you're on the right commit
git log --oneline -5
```

**Expected Output:**
```
29310fa docs: Add JWT migration guide and session 2 report
c92556e feat: Implement JWT-based authentication system (Part 1)
e4c6ea9 docs: Add meal plan progress tracking fix to reports
...
```

### Step 7: Install New Dependencies

```bash
npm install

# Verify new packages installed
npm list | grep -E "jsonwebtoken|cookie-parser|helmet"
```

**Expected Output:**
```
├── @types/cookie-parser@1.4.7
├── @types/jsonwebtoken@9.0.6
├── cookie-parser@1.4.6
├── helmet@7.1.0
└── jsonwebtoken@9.0.2
```

### Step 8: Delete Old Database

```bash
# Show current database info
ls -lh local.db
du -h local.db

# Delete old database
rm local.db

# Verify it's deleted
ls -lh local.db  # Should show "No such file or directory"
```

### Step 9: Start PM2 Application

```bash
pm2 start myapp

# Wait a few seconds, then check status
sleep 5
pm2 status
```

**Expected Output:**
```
┌─────┬──────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name     │ status  │ cpu     │ memory  │ uptime   │
├─────┼──────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ myapp    │ online  │ 10%     │ 120 MB  │ 5s       │
└─────┴──────────┴─────────┴─────────┴─────────┴──────────┘
```

### Step 10: Check Application Logs

```bash
pm2 logs myapp --lines 50
```

**Look for:**
- ✅ `✅ JWT authentication routes registered`
- ✅ `✅ Database connection successful`
- ✅ `Server running at http://0.0.0.0:5000`
- ❌ No error messages

**If you see errors**, check Step 11 (Troubleshooting)

### Step 11: Verify Database Created

```bash
# Check if new database exists
ls -lh local.db

# Check tables in database
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Expected Tables:**
```
api_usage_tracking
badges
daily_progress
food_logs
meal_plans
notifications
progress_photos
recipe_likes
recipes
recipes_in_meal_plan
refresh_tokens
shopping_list_items
user_dietary_preferences
user_nutrition_preferences
user_token_limits
users
```

**Important:** Verify new tables exist:
- ✅ `refresh_tokens`
- ✅ `api_usage_tracking`
- ✅ `user_token_limits`

### Step 12: Test Authentication Endpoints

#### Test 1: Register New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}' \
  -v
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Registration successful",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "hasCompletedOnboarding": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Test 2: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}' \
  -c cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "hasCompletedOnboarding": false,
    ...
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### Test 3: Access Protected Route

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -b cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "id": 1,
  "email": "test@example.com",
  "hasCompletedOnboarding": false,
  ...
}
```

#### Test 4: Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt \
  -v
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Logout successful"
}
```

### Step 13: Test from External Browser

Open your browser and navigate to:
```
http://146.190.166.34:5000
```

**Or your domain:**
```
https://yourdomain.com
```

Try to:
1. Register a new account
2. Login with credentials
3. Access dashboard
4. Logout

### Step 14: Monitor Application

```bash
# Watch logs in real-time
pm2 logs myapp

# Check error logs
pm2 logs myapp --err

# Check application info
pm2 info myapp

# Monitor resource usage
pm2 monit
```

### Step 15: Set Up Automatic Database Cleanup

Create a cron job to clean up expired refresh tokens:

```bash
# Edit crontab
crontab -e

# Add this line to run cleanup daily at 3 AM
0 3 * * * cd /usr/local/lsws/Example/html/Nutri && node -e "import('./server/utils/jwt.js').then(m => m.cleanupExpiredTokens())"
```

---

## 🐛 Troubleshooting

### Issue 1: Application Won't Start

```bash
# Check PM2 logs
pm2 logs myapp --err --lines 100

# Common issues:
# - Missing dependencies → npm install
# - Port already in use → pm2 restart myapp
# - Database locked → rm local.db-shm local.db-wal
```

### Issue 2: Database Not Created

```bash
# Manually create database
node init-sqlite.js

# Or use Drizzle
npx drizzle-kit push:sqlite
```

### Issue 3: JWT Tokens Not Working

```bash
# Check environment variables
env | grep JWT

# If missing, add to .env file:
echo "JWT_SECRET=your-secret-key-here" >> .env
echo "JWT_REFRESH_SECRET=your-refresh-secret-here" >> .env

# Restart application
pm2 restart myapp
```

### Issue 4: Cookies Not Being Set

```bash
# Check CORS configuration in server/index.ts
# Ensure credentials: true is set

# Check browser console for cookie errors
# May need to adjust sameSite and secure settings
```

### Issue 5: 401 Errors on Protected Routes

```bash
# Check if token is being sent
curl -X GET http://localhost:5000/api/auth/me \
  -b cookies.txt \
  -v | grep Cookie

# Check token expiry
# Access tokens expire after 15 minutes
# May need to refresh token
```

---

## 🔄 Rollback Procedure

If something goes wrong:

### Quick Rollback (5 minutes)

```bash
# 1. Stop application
pm2 stop myapp

# 2. Restore database backup
cp backups/local.db.backup.20251018_023000 local.db

# 3. Revert to previous commit
git reset --hard HEAD~2

# 4. Reinstall dependencies
npm install

# 5. Restart application
pm2 restart myapp

# 6. Verify
pm2 logs myapp --lines 50
```

### Verify Rollback

```bash
# Check git commit
git log --oneline -1

# Should show commit BEFORE JWT migration

# Test old auth endpoint
curl http://localhost:5000/api/user

# Should work with session-based auth
```

---

## ✅ Post-Deployment Verification

### Checklist

- [ ] PM2 application running (status: online)
- [ ] No errors in PM2 logs
- [ ] Database file exists with correct tables
- [ ] Can register new user via API
- [ ] Can login via API and receive JWT tokens
- [ ] Can access protected route with valid token
- [ ] Can logout successfully
- [ ] Frontend loads without errors
- [ ] Can register via frontend UI
- [ ] Can login via frontend UI
- [ ] Dashboard accessible after login
- [ ] Logout redirects to login page

---

## 📊 Monitoring Commands

```bash
# Real-time logs
pm2 logs myapp --lines 100

# Application status
pm2 status

# Resource monitoring
pm2 monit

# Restart count
pm2 info myapp | grep restart

# Database size
du -h local.db

# Check refresh tokens
sqlite3 local.db "SELECT COUNT(*) FROM refresh_tokens;"

# Check users
sqlite3 local.db "SELECT id, email FROM users;"
```

---

## 🎯 Success Criteria

Deployment is successful when:

1. ✅ Application starts without errors
2. ✅ All new database tables exist
3. ✅ JWT endpoints respond correctly
4. ✅ Can register and login
5. ✅ Protected routes require authentication
6. ✅ Token refresh works automatically
7. ✅ Logout revokes tokens
8. ✅ No console errors in browser
9. ✅ Frontend auth flows work end-to-end
10. ✅ No memory leaks or performance issues

---

**Deployment Date**: October 18, 2025  
**Migration Version**: JWT v1.0  
**Estimated Downtime**: 5 minutes  
**Rollback Time**: 2 minutes  

---

## 📞 Support

If you encounter issues:

1. Check PM2 logs: `pm2 logs myapp --lines 200`
2. Check database: `sqlite3 local.db .tables`
3. Test endpoints manually with curl
4. Review JWT-MIGRATION-GUIDE.md
5. Contact: ahmad@example.com
