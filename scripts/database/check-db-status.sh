#!/bin/bash

# Check SQLite Database Status Script
# This script helps diagnose database permission issues

echo "🔍 Checking SQLite database status..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DB_PATH="$SCRIPT_DIR/local.db"

# Check database file
echo "Database Path: $DB_PATH"
echo ""

if [ -f "$DB_PATH" ]; then
    echo "✅ Database file exists"
    echo ""
    
    echo "File Permissions:"
    ls -lh "$DB_PATH"
    echo ""
    
    echo "File Owner/Group:"
    stat -c "Owner: %U, Group: %G" "$DB_PATH" 2>/dev/null || stat -f "Owner: %Su, Group: %Sg" "$DB_PATH" 2>/dev/null
    echo ""
    
    echo "Current User: $(whoami)"
    echo ""
    
    # Check if file is writable
    if [ -w "$DB_PATH" ]; then
        echo "✅ Database is writable by current user"
    else
        echo "❌ Database is NOT writable by current user"
        echo "   Run: chmod 664 $DB_PATH"
        echo "   Run: chown $(whoami):$(whoami) $DB_PATH"
    fi
    echo ""
    
    # Check directory permissions
    echo "Directory Permissions:"
    ls -ldh "$SCRIPT_DIR"
    echo ""
    
    if [ -x "$SCRIPT_DIR" ]; then
        echo "✅ Directory is executable (traversable)"
    else
        echo "❌ Directory is NOT executable"
        echo "   Run: chmod 775 $SCRIPT_DIR"
    fi
    echo ""
    
    # Check WAL and SHM files
    if [ -f "$DB_PATH-wal" ]; then
        echo "WAL file exists:"
        ls -lh "$DB_PATH-wal"
    fi
    
    if [ -f "$DB_PATH-shm" ]; then
        echo "SHM file exists:"
        ls -lh "$DB_PATH-shm"
    fi
    
else
    echo "❌ Database file does NOT exist at: $DB_PATH"
    echo ""
    echo "Database should be created when you run:"
    echo "  npm run db:push"
    echo "  OR"
    echo "  node setup.js"
fi

echo ""
echo "🔍 Process Information:"
pm2 list 2>/dev/null || echo "PM2 not found or no processes running"
echo ""

echo "If you see permission errors, run:"
echo "  bash fix-db-permissions.sh"
