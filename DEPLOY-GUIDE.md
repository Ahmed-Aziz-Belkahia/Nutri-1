# Deployment Guide

## Quick Commands

### On VPS - Quick Deploy (no database changes)
```bash
cd /usr/local/lsws/Example/html/Nutri
git pull
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### On VPS - Full Deploy
```bash
cd /usr/local/lsws/Example/html/Nutri
git pull
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### Create Fresh Database (when needed)
```bash
cd /usr/local/lsws/Example/html/Nutri
node emergency-create-db.js
pm2 restart myapp
```

## Deployment Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `quick-deploy.sh` | One-liner: pull → install → build → restart → logs | Code updates only |
| `deploy-complete.sh` | Full deployment with logging | Major updates |
| `emergency-create-db.js` | Create fresh database from schema | Database corruption or schema changes |

## What Each Script Does

### quick-deploy.sh
```bash
git pull && npm install && npm run build && pm2 restart myapp && pm2 logs myapp --lines 20
```
Fast update, shows logs immediately.

### deploy-complete.sh
1. ✅ Install dependencies
2. ✅ Build application
3. ✅ Set database permissions (if exists)
4. ✅ Restart PM2
5. ✅ Show status

**Note:** Does NOT recreate database automatically!

### emergency-create-db.js
1. ✅ Backup old database (timestamped)
2. ✅ Delete old database files
3. ✅ Create all 17 tables from schema
4. ✅ Verify age/gender columns exist
5. ✅ List all created tables

## Common Workflows

### 1. Code Update (No Database Changes)
```bash
./quick-deploy.sh
```

### 2. Database Schema Changed
```bash
node emergency-create-db.js
pm2 restart myapp
```

### 3. Fresh Deployment
```bash
./deploy-complete.sh
node emergency-create-db.js
pm2 logs myapp
```

### 4. Something Broke
```bash
pm2 logs myapp --lines 50  # Check errors
node emergency-create-db.js  # Fix database
pm2 restart myapp
```

## Useful PM2 Commands

```bash
pm2 logs myapp          # View live logs
pm2 logs myapp --lines 50  # Last 50 lines
pm2 status              # Check status
pm2 restart myapp       # Restart app
pm2 stop myapp          # Stop app
pm2 start myapp         # Start app
pm2 flush               # Clear logs
pm2 monit               # Monitor CPU/Memory
```

## Database Commands

```bash
# Create fresh database
node emergency-create-db.js

# Check tables
sqlite3 local.db ".tables"

# Check specific table
sqlite3 local.db "PRAGMA table_info(user_nutrition_preferences);"

# Count records
sqlite3 local.db "SELECT COUNT(*) FROM users;"
```

## Troubleshooting

### "no such table" errors
```bash
node emergency-create-db.js
pm2 restart myapp
```

### Build errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database locked
```bash
pm2 stop myapp
rm -f local.db-wal local.db-shm
pm2 start myapp
```

### Port already in use
```bash
pm2 delete myapp
pm2 start ecosystem.config.js
```
