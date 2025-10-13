# VPS Deployment Guide

## 🚀 Quick Deployment

The easiest way to deploy updates to your VPS:

```bash
cd /usr/local/lsws/Example/html/Nutri
git stash                           # Save any local changes
git pull origin main                # Get latest code
chmod +x deploy-complete.sh         # Make script executable (first time only)
./deploy-complete.sh                # Run comprehensive deployment
```

## 📋 What the Script Does

The `deploy-complete.sh` script automatically handles:

### Step 1: Backup
- Creates timestamped backup: `local.db.backup.YYYYMMDD_HHMMSS`
- Preserves your data before any changes

### Step 2: Health Check
- Runs SQLite integrity check
- Detects corruption before proceeding
- Moves corrupt files to `.corrupt` backup

### Step 3: Dependencies
- Checks if `node_modules` exists
- Runs `npm install` if needed

### Step 4: Database Setup
- Uses existing healthy database
- Or recreates if corrupted using multiple fallback methods:
  1. `npm run db:push` (Drizzle)
  2. `node setup.js`
  3. `node init-sqlite.js`

### Step 5: Database Migrations ✨
**This is the key fix for the "no such column: order" error!**

The script checks for ALL required columns:
- `order` (not `order_num`)
- `is_frozen`
- `is_completed`
- `completed_at`
- `created_at`

If any are missing, it runs:
1. **`add-meal-plan-columns.js`** - Adds all missing columns
2. **`fix-order-column.js`** - Renames `order_num` to `order`

### Step 6: Database Permissions
- Sets database to `664` (rw-rw-r--)
- Sets ownership to `root:root` (matches PM2 user)
- Fixes WAL and SHM files

### Step 7: Directory Permissions
- Sets directory to `775` (rwxrwxr-x)
- Allows web server to read files

### Step 8: PM2 Restart
- Restarts the Node.js app
- Waits 3 seconds for startup

### Step 9: Verification
- Checks PM2 status (should be "online")
- Checks port 5000 is listening
- Shows database info and table list

## 🔧 Troubleshooting

### If PM2 shows "errored" status:
```bash
pm2 logs myapp --err --lines 50
```

### If port 5000 not listening:
```bash
# Check what's using the port
netstat -tlnp | grep 5000

# Try restarting
pm2 restart myapp
```

### If you see "no such column: order" errors:
```bash
# Check current schema
sqlite3 local.db '.schema recipes_in_meal_plan'

# Manually run migrations
node add-meal-plan-columns.js
node fix-order-column.js
pm2 restart myapp
```

### If database is corrupted:
```bash
# Check integrity
sqlite3 local.db "PRAGMA integrity_check;"

# The script will automatically handle this, but you can manually:
mv local.db local.db.corrupt.$(date +%Y%m%d_%H%M%S)
rm -f local.db-wal local.db-shm
npm run db:push
node add-meal-plan-columns.js
node fix-order-column.js
pm2 restart myapp
```

## 📊 Database Schema

The `recipes_in_meal_plan` table should have these columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `meal_plan_id` | INTEGER | Foreign key to meal_plans |
| `recipe_id` | INTEGER | Foreign key to recipes |
| `meal_type` | TEXT | breakfast, lunch, dinner, snack |
| `serving_size` | REAL | Serving multiplier |
| **`order`** | INTEGER | Display order (NOT order_num!) |
| `is_frozen` | INTEGER | 1 = frozen, 0 = not frozen |
| `is_completed` | INTEGER | 1 = completed, 0 = pending |
| `completed_at` | INTEGER | Unix timestamp |
| `created_at` | INTEGER | Unix timestamp |

## 🔄 Manual Deployment (Old Way)

If you need to deploy manually without the script:

```bash
cd /usr/local/lsws/Example/html/Nutri

# 1. Backup
cp local.db local.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. Get latest code
git stash
git pull origin main

# 3. Install dependencies
npm install

# 4. Run migrations
node add-meal-plan-columns.js
node fix-order-column.js

# 5. Fix permissions
chmod 664 local.db
chown root:root local.db
chmod 775 .

# 6. Restart services
systemctl restart lsws
pm2 restart myapp

# 7. Verify
pm2 status
pm2 logs myapp --lines 20
curl http://localhost:5000/api/health
```

## 🐛 Common Issues Fixed

### 1. "SQLITE_READONLY_DBMOVED" Error
**Cause:** Wrong permissions or ownership on database file  
**Fix:** Script sets 664 permissions and root:root ownership

### 2. "no such column: recipes_in_meal_plan.order"
**Cause:** Database has `order_num` instead of `order` column  
**Fix:** Script runs `fix-order-column.js` migration automatically

### 3. Food logs only showing one meal
**Cause:** Aggressive query caching in frontend  
**Fix:** Changed `refetchOnMount: true` and reduced `staleTime` to 10s

### 4. "SQLITE_CORRUPT: database disk image is malformed"
**Cause:** Corruption during migration or permission changes  
**Fix:** Script detects corruption and recreates database with all migrations

## 📝 Testing After Deployment

1. **Check app is running:**
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status":"healthy"}
   ```

2. **Test food scanning:**
   - Open app in browser
   - Navigate to "Add Food" → "Scan Image"
   - Upload a food image
   - Verify it appears in dashboard

3. **Test meal plan generation:**
   - Click "Generate Meal Plan"
   - Should generate without "no such column" errors

4. **Test multiple food logs:**
   - Scan multiple meals
   - All should appear in dashboard (not just one)

## 🎯 Success Indicators

After running `deploy-complete.sh`, you should see:

✅ All steps showing checkmarks  
✅ PM2 status: "online"  
✅ Port 5000 listening  
✅ Database has 15 tables  
✅ `recipes_in_meal_plan` has `order` column (not `order_num`)  

## 📞 Support

If deployment fails:
1. Check the script output for ❌ error indicators
2. Follow the troubleshooting commands shown at the end
3. Check logs: `pm2 logs myapp --err --lines 50`
4. Verify database schema: `sqlite3 local.db '.schema recipes_in_meal_plan'`
