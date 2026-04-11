#!/bin/bash

# Fix SQLite Database Permissions Script
# This script fixes the "SQLITE_READONLY_DBMOVED" error by setting correct permissions

echo "🔧 Fixing SQLite database permissions..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DB_PATH="$SCRIPT_DIR/local.db"
DB_DIR="$SCRIPT_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found at: $DB_PATH"
    echo "Creating database..."
    touch "$DB_PATH"
fi

# Get the current user (who runs the Node.js process)
CURRENT_USER=$(whoami)
echo "Current user: $CURRENT_USER"

# Fix file permissions
echo "Setting file permissions to 664 (rw-rw-r--)..."
chmod 664 "$DB_PATH"

# Fix directory permissions (directory needs execute permission for traversal)
echo "Setting directory permissions to 775 (rwxrwxr-x)..."
chmod 775 "$DB_DIR"

# Set ownership to current user
echo "Setting ownership to $CURRENT_USER..."
chown "$CURRENT_USER:$CURRENT_USER" "$DB_PATH"

# Also fix the WAL and SHM files if they exist
if [ -f "$DB_PATH-wal" ]; then
    echo "Fixing WAL file permissions..."
    chmod 664 "$DB_PATH-wal"
    chown "$CURRENT_USER:$CURRENT_USER" "$DB_PATH-wal"
fi

if [ -f "$DB_PATH-shm" ]; then
    echo "Fixing SHM file permissions..."
    chmod 664 "$DB_PATH-shm"
    chown "$CURRENT_USER:$CURRENT_USER" "$DB_PATH-shm"
fi

# Verify permissions
echo ""
echo "✅ Permissions fixed! Current status:"
ls -la "$DB_PATH" 2>/dev/null || echo "Database file not found"
ls -la "$DB_PATH-wal" 2>/dev/null || echo "WAL file not found (normal if not in WAL mode)"
ls -la "$DB_PATH-shm" 2>/dev/null || echo "SHM file not found (normal if not in WAL mode)"

echo ""
echo "🎉 Done! Try restarting your application with PM2:"
echo "   pm2 restart myapp"
