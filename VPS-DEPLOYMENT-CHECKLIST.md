# VPS Deployment Checklist - November 8, 2025

## 🚀 Step-by-Step Deployment Guide

### 1. **Connect to VPS**
```bash
ssh your-username@your-vps-ip
# or
ssh root@your-vps-ip
```

### 2. **Navigate to Project Directory**
```bash
cd /path/to/Nutri-1
# Common paths:
# cd ~/Nutri-1
# cd /var/www/Nutri-1
# cd /home/user/Nutri-1
```

### 3. **Pull Latest Changes**
```bash
# Check current status
git status

# Stash any local changes (if needed)
git stash

# Pull latest code
git pull origin main

# If you stashed changes, apply them back
git stash pop
```

### 4. **Install Dependencies** (if package.json changed)
```bash
npm install
```

### 5. **Check Database Schema**

#### Option A: Using the check script
```bash
node check-db-health.js
```

#### Option B: Manual DB check
```bash
# Check if database file exists
ls -lh local.db

# View database structure
sqlite3 local.db ".schema"

# Check specific tables
sqlite3 local.db "SELECT sql FROM sqlite_master WHERE type='table';"

# Check users table structure
sqlite3 local.db ".schema users"

# Verify onboarding_completed column exists
sqlite3 local.db "PRAGMA table_info(users);"
```

### 6. **Verify Database Schema Requirements**

Your database should have these tables with these key columns:

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  name TEXT,
  profileImage TEXT,
  onboarding_completed INTEGER DEFAULT 0,  -- IMPORTANT!
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### User Profiles Table
```sql
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  age INTEGER,
  gender TEXT,
  height REAL,
  currentWeight REAL,
  goalWeight REAL,
  weightGoal TEXT,
  activityLevel TEXT,
  caloriesGoal INTEGER,
  proteinGoal REAL,
  carbsGoal REAL,
  fatGoal REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 7. **Run Database Migrations** (if needed)

If `onboarding_completed` column is missing:
```bash
node add-onboarding-column.js
```

If you need to recreate the database:
```bash
# CAUTION: This will delete all data!
node recreate-database-complete.js
```

### 8. **Restart the Application**

#### Using PM2 (recommended)
```bash
# Check current processes
pm2 list

# Restart the app
pm2 restart nutri-app
# or
pm2 restart all

# View logs
pm2 logs nutri-app

# Check status
pm2 status
```

#### Using npm/node directly
```bash
# Stop current process (Ctrl+C if running)

# Rebuild (if using TypeScript)
npm run build

# Start the app
npm start
# or
npm run dev
```

#### Using systemd service
```bash
sudo systemctl restart nutri-app
sudo systemctl status nutri-app
sudo journalctl -u nutri-app -f
```

### 9. **Verify Deployment**

#### Check Application Status
```bash
# Test if server is responding
curl http://localhost:5000/api/health
# or
curl http://your-domain.com/api/health

# Check if frontend is accessible
curl http://your-domain.com
```

#### Check Logs
```bash
# PM2 logs
pm2 logs nutri-app --lines 50

# Application logs (if you have a log file)
tail -f logs/app.log

# System logs
tail -f /var/log/syslog | grep nutri
```

### 10. **Test Key Features**

Open your browser and test:
- [ ] Login/Registration works
- [ ] Onboarding flow works (WHO formulas, formula explanation)
- [ ] Profile page loads
- [ ] Edit Goals modal works
- [ ] Edit Metrics modal works
- [ ] Delete recipe confirmation modal works
- [ ] Camera access on mobile (if available)
- [ ] Session persists after refresh
- [ ] Food analysis works
- [ ] Recipe creation/deletion works

---

## 🔍 Quick Database Health Check

```bash
# Run this one-liner to check everything
sqlite3 local.db "SELECT 
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM user_profiles) as profile_count,
  (SELECT COUNT(*) FROM food_logs) as food_log_count,
  (SELECT COUNT(*) FROM recipes) as recipe_count;"
```

---

## 🛠️ Troubleshooting

### Issue: Git pull fails with conflicts
```bash
# View conflicting files
git status

# Option 1: Keep your changes
git stash
git pull
git stash pop

# Option 2: Discard local changes
git reset --hard origin/main
git pull
```

### Issue: Database schema is outdated
```bash
# Backup current database
cp local.db local.db.backup-$(date +%Y%m%d-%H%M%S)

# Run migration
node add-onboarding-column.js

# Verify
sqlite3 local.db "PRAGMA table_info(users);"
```

### Issue: Application won't start
```bash
# Check logs
pm2 logs nutri-app --lines 100

# Check port availability
netstat -tulpn | grep 5000

# Check environment variables
cat .env

# Rebuild dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Session issues persist
```bash
# Clear PM2 cache
pm2 delete all
pm2 flush

# Restart fresh
pm2 start ecosystem.config.js
```

---

## 📊 Expected Database Schema Verification

After pulling and running migrations, verify these columns exist:

### Users Table Must Have:
```bash
sqlite3 local.db "PRAGMA table_info(users);" | grep onboarding_completed
```
Should return: `onboarding_completed INTEGER DEFAULT 0`

### User Profiles Must Have:
```bash
sqlite3 local.db "PRAGMA table_info(user_profiles);"
```
Should include: age, gender, height, currentWeight, goalWeight, weightGoal, activityLevel, caloriesGoal, proteinGoal, carbsGoal, fatGoal

---

## ✅ Deployment Complete Checklist

- [ ] Connected to VPS successfully
- [ ] Navigated to project directory
- [ ] Pulled latest changes from GitHub
- [ ] Installed/updated dependencies
- [ ] Verified database schema is correct
- [ ] Ran any necessary migrations
- [ ] Restarted the application
- [ ] Checked application logs (no errors)
- [ ] Tested application in browser
- [ ] Verified all new features work
- [ ] Session persistence working (1 year)
- [ ] Custom modals displaying correctly
- [ ] iOS fixes verified (if applicable)

---

## 🔐 Security Reminder

After deployment, verify:
- [ ] .env file has correct production values
- [ ] Database file has proper permissions (chmod 600 local.db)
- [ ] Uploads directory has proper permissions
- [ ] SSL certificate is valid (if using HTTPS)
- [ ] Firewall rules are correct

---

## 📞 Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs nutri-app`
2. Check database: `node check-db-health.js`
3. Verify environment: `cat .env`
4. Check disk space: `df -h`
5. Check memory: `free -h`

---

*Deployment Guide Generated: November 8, 2025*
*Last Updated: After session improvements commit (64a6e68)*
