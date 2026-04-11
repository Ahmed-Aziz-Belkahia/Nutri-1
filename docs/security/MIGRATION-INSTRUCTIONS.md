# Production Database Migration Guide

## Error on VPS
The production database is missing the `age` and `gender` columns that were added to the schema.

Error: `SqliteError: no such column: "age"`

## Solution: Run Migration on VPS

### Option 1: SSH and Run Migration Script

```bash
# SSH into your VPS
ssh your-user@your-vps-ip

# Navigate to the app directory
cd /usr/local/lsws/Example/html/Nutri

# Pull latest changes (includes migration script)
git pull origin main

# Run the migration
node add-age-gender-migration.js

# Restart the app
pm2 restart myapp

# Check logs
pm2 logs myapp
```

### Option 2: Manual SQL (if script doesn't work)

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Navigate to app directory
cd /usr/local/lsws/Example/html/Nutri

# Open SQLite database
sqlite3 local.db

# Run these SQL commands:
ALTER TABLE user_nutrition_preferences ADD COLUMN age INTEGER;
ALTER TABLE user_nutrition_preferences ADD COLUMN gender TEXT;

# Exit SQLite
.exit

# Restart app
pm2 restart myapp
```

### Option 3: Use the Deployment Script

The deployment script has been updated to run migrations automatically:

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Navigate to app directory
cd /usr/local/lsws/Example/html/Nutri

# Pull latest changes
git pull origin main

# Run deployment script (includes migration)
bash deploy-vps.sh
```

## Verify Migration Success

After running the migration, check the logs:
```bash
pm2 logs myapp --lines 50
```

You should see:
- ✅ "Migration completed successfully!"
- ✅ No more "no such column: age" errors
- ✅ Users can complete onboarding without errors

## What the Migration Does

Adds two new columns to the `user_nutrition_preferences` table:
- `age` (INTEGER) - User's age from onboarding
- `gender` (TEXT) - User's gender from onboarding

These columns are now required for the onboarding quiz to save properly.
