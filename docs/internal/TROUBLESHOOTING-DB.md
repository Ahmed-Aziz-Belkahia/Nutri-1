# SQLite Database Troubleshooting Guide

## Error: SQLITE_READONLY_DBMOVED

This error occurs when the Node.js process doesn't have write permissions to the SQLite database file or its directory.

### Quick Fix (Production Server)

```bash
# 1. Navigate to your app directory
cd /usr/local/lsws/Example/html/Nutri

# 2. Run the permission fix script
bash fix-db-permissions.sh

# 3. Restart PM2
pm2 restart myapp

# 4. Check logs
pm2 logs myapp --lines 50
```

### Manual Fix

```bash
# Check who owns the file
ls -la local.db

# Fix permissions
chmod 664 local.db
chown $USER:$USER local.db

# Fix directory permissions (important!)
chmod 775 .

# If WAL mode files exist, fix them too
chmod 664 local.db-wal 2>/dev/null || true
chmod 664 local.db-shm 2>/dev/null || true
```

### Common Causes

1. **Wrong User Running the Process**
   - PM2 might be running as a different user
   - Check with: `pm2 list` and `ps aux | grep node`
   - Solution: Ensure PM2 runs as the same user who owns the database

2. **Directory Permissions**
   - SQLite needs to create temporary files in the same directory
   - Directory needs execute permission (755 or 775)
   - Solution: `chmod 775 /path/to/app/directory`

3. **SELinux Context (if on CentOS/RHEL)**
   - SELinux might be blocking writes
   - Check with: `getenforce`
   - Temporary fix: `sudo setenforce 0`
   - Permanent fix: Set proper SELinux context

4. **Read-Only Filesystem**
   - Check if filesystem is mounted read-only
   - Check with: `mount | grep "$(df . | tail -1 | awk '{print $1}')"`

### Prevention

Add this to your deployment script:

```bash
# In deploy.sh or deploy-vps.sh
echo "Setting database permissions..."
chmod 664 local.db 2>/dev/null || true
chmod 775 . 2>/dev/null || true
chown -R $USER:$USER . 2>/dev/null || true
```

### Diagnostic Commands

```bash
# Check database status
bash check-db-status.sh

# Test database write access
sqlite3 local.db "CREATE TABLE IF NOT EXISTS test (id INTEGER); DROP TABLE test;"

# Check PM2 process user
pm2 describe myapp | grep user

# Check file permissions in detail
namei -l local.db
```

### Alternative: Use Environment Variable for DB Path

You can now set a custom database path using the `DATABASE_PATH` environment variable:

```bash
# In .env or .env.production
DATABASE_PATH=/var/lib/nutri-app/database.db
```

This allows you to place the database in a location with proper permissions.

### Still Having Issues?

1. Check the logs for more details:
   ```bash
   pm2 logs myapp --lines 100
   ```

2. Verify the database file exists and is not corrupted:
   ```bash
   sqlite3 local.db "PRAGMA integrity_check;"
   ```

3. Check disk space:
   ```bash
   df -h .
   ```

4. Restart PM2 completely:
   ```bash
   pm2 kill
   pm2 start ecosystem.config.js
   ```

### Database Location Reference

- **Default:** `./local.db` (relative to app root)
- **Configurable via:** `DATABASE_PATH` environment variable
- **WAL files:** `local.db-wal` and `local.db-shm` (created automatically in WAL mode)

### Security Notes

- **Permissions 664** means: owner can read/write, group can read/write, others can read
- This is safe if your web server and Node.js process share the same group
- For maximum security, use 660 (no other-read) if all processes use the same user/group

### Related Files Modified

- `db/index.ts` - Enhanced with better error handling, WAL mode, and configurable path
- `fix-db-permissions.sh` - Script to automatically fix permissions
- `check-db-status.sh` - Script to diagnose permission issues
