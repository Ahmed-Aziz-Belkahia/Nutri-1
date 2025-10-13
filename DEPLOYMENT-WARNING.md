# ⚠️ CRITICAL: VPS Deployment Warning

## 🚨 DO NOT USE MANUAL PERMISSION COMMANDS!

### ❌ NEVER Run These Commands

```bash
# ❌ WRONG - Will corrupt the database!
sudo chown -R nobody:nogroup ./
sudo chmod -R 777 ./
sudo systemctl restart lsws
```

**Why?** These commands:
1. Change database ownership from `root:root` to `nobody:nogroup`
2. PM2 runs as `root`, but database is owned by `nobody:nogroup`
3. **Result:** Permission mismatch → Database corruption → Data loss!

---

## ✅ CORRECT Deployment Workflow

**Use ONLY this command:**

```bash
cd /usr/local/lsws/Example/html/Nutri
git stash                    # Save any local changes (optional)
git pull origin main         # Get latest code
./deploy-complete.sh         # Does EVERYTHING automatically
```

**That's it!** The script handles:
- ✅ Database backup
- ✅ Health checks
- ✅ Database creation/migration
- ✅ Correct permissions (664 for DB, root:root ownership)
- ✅ PM2 restart
- ✅ LiteSpeed doesn't need manual restart
- ✅ Verification

---

## 🔥 What Happens If You Ignore This Warning

### Scenario 1: Using `chown nobody:nogroup`
1. You run: `./deploy-complete.sh` → Database owned by `root:root` ✅
2. You run: `chown -R nobody:nogroup ./` → Database owned by `nobody:nogroup` ❌
3. PM2 (running as root) tries to access database
4. **Database corrupts** (SQLITE_CORRUPT error)
5. **ALL DATA IS LOST** - database must be recreated
6. Users, meals, progress, everything deleted 💀

### Scenario 2: Using `chmod 777`
1. Security risk - anyone can read/write your database
2. World-writable files are dangerous on production servers
3. Some systems will refuse to run with 777 permissions

---

## 📊 Correct Permission Model

The deployment script sets these permissions:

```bash
# Database file
-rw-rw-r-- 1 root root local.db    (664)
# Owner: root (read+write)
# Group: root (read+write)
# Others: (read only)

# WAL files
-rw-rw-r-- 1 root root local.db-wal
-rw-rw-r-- 1 root root local.db-shm

# Directory
drwxrwxr-x root root /usr/local/lsws/Example/html/Nutri (775)
```

**Why root:root?**
- PM2 runs as `root` user
- PM2 needs to read/write the database
- LiteSpeed proxies to PM2 on port 5000
- LiteSpeed doesn't need direct file access

---

## 🛑 If You Already Ran the Wrong Commands

If you ran `chown nobody:nogroup` and see database corruption errors:

1. **Run the deployment script immediately:**
   ```bash
   ./deploy-complete.sh
   ```

2. **The script will:**
   - Detect corruption
   - Create backup of corrupt database
   - Recreate fresh database
   - Run all migrations
   - Set correct permissions

3. **Data loss:**
   - All data will be lost (users, meals, etc.)
   - You'll need to restore from backup if you have one
   - Or recreate test data

---

## 📝 Common Questions

### Q: Why doesn't LiteSpeed need restart?
**A:** LiteSpeed proxies to `localhost:5000`. When PM2 restarts the app, it comes back on the same port. No LiteSpeed restart needed.

### Q: What if I need to change web server config?
**A:** Only restart LiteSpeed if you changed its configuration files (vhost settings, rewrites, etc.). Not for code deployments.

### Q: Can I run the deployment script multiple times?
**A:** Yes! It's safe to run multiple times. It checks everything before making changes.

### Q: What about the old `deploy.sh` script?
**A:** Use `deploy-complete.sh` instead. It's more comprehensive and safer.

---

## 🎯 Quick Reference Card

Print this and keep it near your computer:

```
╔════════════════════════════════════════════╗
║     NUTRI-AI VPS DEPLOYMENT CHEAT SHEET    ║
╠════════════════════════════════════════════╣
║                                            ║
║  ✅ CORRECT:                               ║
║     git pull origin main                   ║
║     ./deploy-complete.sh                   ║
║                                            ║
║  ❌ WRONG:                                 ║
║     chown -R nobody:nogroup ./             ║
║     chmod -R 777 ./                        ║
║     systemctl restart lsws                 ║
║                                            ║
║  📝 Remember:                              ║
║     - Only use deploy-complete.sh          ║
║     - Never change permissions manually    ║
║     - Database = root:root (always!)       ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

## 🔧 Emergency Recovery

If database is corrupted and you have a backup:

```bash
cd /usr/local/lsws/Example/html/Nutri

# Find your backup
ls -lt local.db.backup.*

# Restore (replace TIMESTAMP with actual timestamp)
cp local.db.backup.YYYYMMDD_HHMMSS local.db

# Fix permissions
chmod 664 local.db
chown root:root local.db

# Restart
pm2 restart myapp
```

---

## 📞 Support

If you encounter issues:

1. **Check database health:**
   ```bash
   sqlite3 local.db "PRAGMA integrity_check;"
   ```

2. **Check permissions:**
   ```bash
   ls -lh local.db
   # Should show: -rw-rw-r-- 1 root root
   ```

3. **Run deployment script:**
   ```bash
   ./deploy-complete.sh
   ```

4. **Check logs:**
   ```bash
   pm2 logs myapp --err --lines 50
   ```

---

**Last Updated:** October 13, 2025  
**Critical Priority:** Follow this guide exactly to prevent data loss!
