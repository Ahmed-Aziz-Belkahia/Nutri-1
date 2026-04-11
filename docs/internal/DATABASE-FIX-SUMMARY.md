# ✅ Database Issue Prevention - Complete Setup

## What Was Fixed

### Previous Issues
1. ❌ `refresh_tokens` table missing after DB deletion
2. ❌ `user_token_limits` table missing
3. ❌ `food_logs` missing 14 columns (had 10, needed 24)
4. ❌ `description`, `ingredients`, `instructions` columns missing
5. ❌ Recipe metadata columns missing (`cuisine_type`, `meal_type`, etc.)
6. ❌ Drizzle Kit's `db:push` not creating all columns properly

### What's Fixed Now
✅ Comprehensive recreation script (`recreate-database-complete.js`)
✅ Automatic backup before any recreation
✅ All 20 tables created with complete schema
✅ All 24 columns in food_logs guaranteed
✅ JWT authentication tables (refresh_tokens, user_token_limits)
✅ API tracking tables (api_usage_tracking)
✅ Performance indexes created
✅ Schema validation after creation
✅ NPM scripts for easy access

## New Scripts Available

### 1. `npm run db:fix` ⭐ **RECOMMENDED**
**Use When:**
- After deleting database
- Getting "no such table" errors
- Getting "no such column" errors
- Database corrupted
- Schema out of sync

**What It Does:**
- Creates backup automatically
- Drops all tables
- Recreates all 20 tables
- Ensures all 24 columns in food_logs
- Creates indexes
- Validates schema
- **Guaranteed to work**

### 2. `npm run db:recreate`
Same as `db:fix`, just another name for it.

### 3. `npm run db:push`
Uses Drizzle Kit (sometimes incomplete, use db:fix after if issues occur)

## File Structure Created

```
/Nutri-1
├── local.db                              # Main database
├── local.db-wal                          # Write-ahead log (auto)
├── local.db-shm                          # Shared memory (auto)
├── local.db.backup.2025-*               # Auto backups (timestamped)
├── recreate-database-complete.js        # Main recreation script
├── setup-database.js                    # Deployment setup
├── DATABASE-GUIDE.md                    # Comprehensive guide
├── DB-QUICK-FIX.md                      # Quick reference
└── package.json                         # Updated with new scripts
```

## Complete Database Schema (20 Tables)

### Authentication & Users
1. `users` - User accounts
2. `refresh_tokens` - JWT refresh tokens
3. `user_token_limits` - AI token usage limits
4. `password_reset_tokens` - Password reset functionality

### Nutrition & Logging
5. `user_nutrition_preferences` - Daily goals (calories/macros)
6. `food_logs` - **24 columns** including recipe fields
7. `weight_logs` - Weight tracking over time
8. `daily_progress` - Daily nutrition tracking

### Recipes & Meal Planning
9. `recipes` - Recipe database
10. `recipe_likes` - User likes on recipes
11. `recipe_comments` - Recipe comments
12. `meal_plans` - Meal planning
13. `recipes_in_meal_plan` - Recipes in plans
14. `shopping_list_items` - Shopping lists

### Progress & Gamification
15. `progress_photos` - Progress photos
16. `badges` - Achievement badges
17. `user_badges` - Earned badges
18. `notifications` - In-app notifications

### Preferences & Tracking
19. `user_dietary_preferences` - Dietary restrictions/preferences
20. `api_usage_tracking` - API call tracking and costs

## Critical: food_logs Schema (24 Columns)

### Basic Fields (10)
- id, user_id, name
- calories, protein, carbs, fat
- date, image, components

### Recipe Enhancement Fields (14) ✅ NOW GUARANTEED
- `description` - Meal description
- `ingredients` - JSON ingredient list
- `instructions` - JSON cooking steps
- `prep_time` - Preparation time (minutes)
- `cook_time` - Cooking time (minutes)
- `servings` - Number of servings
- `image_url` - Additional image URL
- `source` - Origin (scanned/manual/ai)
- `is_recipe` - Flag for recipes
- `recipe_id` - Link to recipes table
- `cuisine_type` - Cuisine category
- `meal_type` - Breakfast/lunch/dinner/snack
- `difficulty` - Easy/medium/hard
- `tags` - JSON array of tags

## Usage Guide

### After Deleting Database
```bash
# Run this ONE command:
npm run db:fix

# Then restart server:
npm run dev
```

### After Schema Changes in Code
```bash
# If you modified db/schema.ts:
npm run db:fix
```

### Initial Setup (New Clone)
```bash
npm install
npm run db:fix
npm run dev
```

### Deployment
```bash
npm run setup  # This now uses recreate-database-complete.js
```

## Verification

After running `npm run db:fix`, you should see:

```
✅ Total tables: 20/20
✅ food_logs columns: 24/24
✅ Schema validation passed!
🎉 Database recreation completed successfully!
```

If you see all green checkmarks, you're good to go!

## Troubleshooting

### Issue: Script won't run
**Solution:**
```bash
# Make sure you're in project root
cd C:\Users\ahmad\dev\Nutri-1

# Then run:
npm run db:fix
```

### Issue: Still getting errors after recreation
**Solution:**
```bash
# Nuclear option - delete and recreate:
Remove-Item local.db* -Force
npm run db:fix
npm run dev
```

### Issue: Backup location
Backups are created in project root:
```
local.db.backup.2025-11-08T08-30-54
```
They're safe to delete after confirming new DB works.

## Best Practices

### ✅ DO:
- Run `npm run db:fix` after deleting database
- Run `npm run db:fix` after schema changes
- Run `npm run db:fix` when getting schema errors
- Keep at least one backup before deleting old ones

### ❌ DON'T:
- Delete database without running `npm run db:fix` after
- Rely on `npm run db:push` alone (use as first step, then db:fix)
- Modify database structure manually
- Delete all backups (keep latest 2-3)

## What Makes This Different

### Old Way (Problematic):
```bash
npm run db:push
```
- Used Drizzle Kit
- Sometimes missed columns
- No validation
- Silent failures
- Required manual column fixes

### New Way (Guaranteed):
```bash
npm run db:fix
```
- Direct SQL creation
- All columns guaranteed
- Automatic backups
- Schema validation
- Self-healing
- Clear error messages

## Emergency Contacts

If the database script fails:
1. Check the error message (will be clear)
2. Verify you're in project root
3. Check permissions on local.db
4. Try the nuclear option (delete + recreate)
5. If still fails, check `db/schema.ts` for syntax errors

## Summary

🎯 **Main Takeaway:**

**Next time you delete the database, just run:**
```bash
npm run db:fix
```

That's it! No more:
- ❌ Missing column errors
- ❌ Missing table errors  
- ❌ Manual fixes
- ❌ Confusion about what to do

Just one command, and you're guaranteed a working database with all:
- ✅ 20 tables
- ✅ 24 columns in food_logs
- ✅ All auth tables
- ✅ All indexes
- ✅ Validated schema

---

**Files to keep:**
- `recreate-database-complete.js` - The magic script
- `DATABASE-GUIDE.md` - Comprehensive reference
- `DB-QUICK-FIX.md` - Quick reminder
- `package.json` - Has the npm scripts

**Remember:** `npm run db:fix` is your friend! 🚀
