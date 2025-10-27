# VPS Database Reset and Redeployment Guide

## Complete Reset Commands (Run in order)

### Step 1: Delete ALL database files and cached data
```bash
ssh root@89.116.110.161 "cd /usr/local/lsws/Example/html/Nutri && rm -f local.db local.db-wal local.db-shm"
```

### Step 2: Pull latest code, run deployment script (includes setup.js)
```bash
ssh root@89.116.110.161 "cd /usr/local/lsws/Example/html/Nutri && git stash && git pull && chmod +x deploy-complete.sh && ./deploy-complete.sh"
```

### Step 3: Verify deployment
```bash
ssh root@89.116.110.161 "cd /usr/local/lsws/Example/html/Nutri && pm2 logs --lines 30"
```

---

## What This Does:

### Step 1: Clean Slate
- `rm -f local.db` - Deletes main database file
- `rm -f local.db-wal` - Deletes Write-Ahead Log (transaction journal)
- `rm -f local.db-shm` - Deletes Shared Memory file (for concurrent access)

### Step 2: Deploy with Fresh Database
The `deploy-complete.sh` script will:
1. Install/update dependencies
2. Build application (Vite + esbuild)
3. Check database schema
4. Since no DB exists, it will run `generate-db-from-drizzle.js` which creates:
   - Base tables (users, recipes, meal_plans, etc.)
   - **food_logs table with ALL 24 columns** (10 base + 14 recipe fields)
5. Set proper file permissions
6. Restart PM2

### Step 3: Verify
- Check PM2 logs to ensure:
  - No database errors
  - Schema validation passing
  - App running correctly

---

## Expected Output:

### After Step 1:
```
(No output - files deleted silently)
```

### After Step 2:
```
🚀 Complete Deployment Starting...

📦 Step 1/5: Installing dependencies...
✅ Done

🏗️  Step 2/5: Building application...
✅ Done

🔍 Step 3/5: Checking database schema...
⚠️  No database found, creating from Drizzle schema...
✅ Database created from Drizzle schema

🔐 Step 4/5: Setting permissions...
✅ Database permissions set

🔄 Step 5/5: Restarting PM2...
✅ PM2 restarted

🎉 Deployment Complete!
```

### After Step 3:
```
0|myapp  | ✅ SQLite database opened successfully
0|myapp  | ✅ Database connection successful
0|myapp  | Server running at http://0.0.0.0:5000
```

---

## Troubleshooting:

### If food scanning still fails with validation errors:
The `dist/` folder likely has stale compiled code. Force a clean rebuild:
```bash
ssh root@89.116.110.161 "cd /usr/local/lsws/Example/html/Nutri && rm -rf dist/ node_modules/.vite && npm run build && pm2 restart myapp"
```

### If you need to check the database schema:
```bash
ssh root@89.116.110.161 "cd /usr/local/lsws/Example/html/Nutri && sqlite3 local.db 'PRAGMA table_info(food_logs);'"
```

You should see all 24 columns including:
- description
- ingredients
- instructions
- prep_time
- cook_time
- servings
- image_url
- source
- is_recipe
- recipe_id
- cuisine_type
- meal_type
- difficulty
- tags

---

## Quick Copy-Paste (All Steps Combined):

```bash
# Complete reset and redeploy in one command
ssh root@89.116.110.161 "cd /usr/local/lsws/Example/html/Nutri && rm -f local.db local.db-wal local.db-shm && git stash && git pull && chmod +x deploy-complete.sh && ./deploy-complete.sh && pm2 logs --lines 30"
```

---

## What's Fixed:

✅ **generate-db-from-drizzle.js** - Now creates food_logs with ALL 14 recipe fields
✅ **deploy-complete.sh** - Now checks for recipe fields before regenerating DB  
✅ **server/services/food-recognition.ts** - Schema uses `.partial().required()` for optional fields
✅ **Migration script** - Ready to add fields to existing databases
✅ **All code committed** - Latest changes on GitHub

