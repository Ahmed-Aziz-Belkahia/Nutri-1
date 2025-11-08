# Database Management Guide

## Quick Reference

### ✅ Normal Setup (First Time or After Pull)
```bash
npm run db:push
```
This uses Drizzle Kit to sync your schema with the database.

### 🔄 Complete Database Recreation (After Deletion or Corruption)
```bash
node recreate-database-complete.js
```
**What this does:**
- Backs up existing database (if any)
- Drops all tables
- Recreates all 20 tables with complete schema
- Creates all required columns (especially food_logs with 24 columns)
- Creates JWT authentication tables (refresh_tokens, user_token_limits)
- Creates API tracking tables
- Adds performance indexes
- Validates schema

**Use this when:**
- You've deleted the database and want to start fresh
- Database schema is corrupted or missing columns
- Getting "no such column" errors
- After major schema changes

### 🚨 If You Get "Missing Column" Errors

**Symptoms:**
```
SqliteError: no such table: refresh_tokens
SqliteError: no such column: "description"
```

**Solution:**
```bash
node recreate-database-complete.js
```

## Database Schema

### Core Tables (20 total)
1. **users** - User accounts
2. **user_nutrition_preferences** - Daily calorie/macro goals
3. **food_logs** - Meal logs (24 columns including recipe fields)
4. **weight_logs** - Weight tracking
5. **recipes** - Recipe database
6. **recipe_likes** - Recipe likes from users
7. **recipe_comments** - Recipe comments
8. **progress_photos** - Progress photos
9. **user_dietary_preferences** - Dietary restrictions/preferences
10. **meal_plans** - Meal planning
11. **recipes_in_meal_plan** - Recipes assigned to meal plans
12. **shopping_list_items** - Shopping lists
13. **password_reset_tokens** - Password reset functionality
14. **badges** - Achievement badges
15. **user_badges** - User earned badges
16. **daily_progress** - Daily nutrition tracking
17. **notifications** - In-app notifications
18. **refresh_tokens** - JWT refresh tokens (authentication)
19. **user_token_limits** - AI token usage limits per user
20. **api_usage_tracking** - API call tracking and costs

### Critical Columns in food_logs (24 total)

**Basic meal data:**
- id, user_id, name, calories, protein, carbs, fat, date, image, components

**Recipe-like fields (for enhanced meal logs):**
- description, ingredients, instructions
- prep_time, cook_time, servings
- image_url, source, is_recipe, recipe_id
- cuisine_type, meal_type, difficulty, tags

## Common Issues

### Issue: Login fails after DB recreation
**Symptom:** "no such table: refresh_tokens"
**Cause:** Drizzle Kit didn't create authentication tables
**Solution:** Run `node recreate-database-complete.js`

### Issue: Food logs API fails
**Symptom:** "no such column: description"
**Cause:** food_logs table missing extended columns
**Solution:** Run `node recreate-database-complete.js`

### Issue: Database file deleted
**Cause:** Manual deletion or crash
**Solution:** Run `node recreate-database-complete.js` to recreate from scratch

## Scripts Explained

### `recreate-database-complete.js` ⭐ RECOMMENDED
- **Purpose:** Complete database recreation with all tables and columns
- **Safety:** Creates automatic backup before recreating
- **When:** After deletion, corruption, or missing columns
- **Guarantee:** All 24 columns in food_logs, all auth tables, all indexes

### `setup-database.js`
- **Purpose:** Deployment/production setup
- **Method:** Calls `npm run db:push` then runs complete recreation
- **When:** Initial deployment, production setup

### `npm run db:push` (Drizzle Kit)
- **Purpose:** Schema migration based on db/schema.ts
- **Issue:** Sometimes doesn't create all columns properly
- **Recommendation:** Follow up with `recreate-database-complete.js` if errors occur

## Best Practices

1. **Always backup before recreation:**
   - `recreate-database-complete.js` does this automatically
   - Backups are saved as `local.db.backup.YYYY-MM-DDTHH-MM-SS`

2. **After any schema changes:**
   ```bash
   # If you modified db/schema.ts
   node recreate-database-complete.js
   ```

3. **Before deployment:**
   ```bash
   node recreate-database-complete.js
   ```

4. **After pulling major changes:**
   ```bash
   # If schema changed in the pull
   node recreate-database-complete.js
   ```

## Verification

After recreation, you should see:
```
✅ Total tables: 20/20
✅ food_logs columns: 24/24
✅ Schema validation passed!
```

If you don't see this, something went wrong and you may need to:
1. Delete `local.db` manually
2. Run `node recreate-database-complete.js` again

## Emergency: Nuclear Option

If nothing works:
```bash
# Delete everything
Remove-Item local.db* -Force

# Recreate from scratch
node recreate-database-complete.js

# Restart server
npm run dev
```

## Files Reference

- `local.db` - Main SQLite database
- `local.db-wal` - Write-Ahead Log (auto-generated)
- `local.db-shm` - Shared memory (auto-generated)
- `local.db.backup.*` - Automatic backups (timestamped)
- `db/schema.ts` - Source of truth for schema
- `drizzle.config.ts` - Drizzle Kit configuration

---

**Remember:** When in doubt, run `node recreate-database-complete.js` - it's safe (creates backups) and guaranteed to work.
