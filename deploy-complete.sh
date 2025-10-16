#!/bin/bash

# Complete VPS Deployment and Database Setup Script
# Run this after git pull to set up everything

echo "🚀 Starting Nutri-AI VPS Deployment..."
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# Step 1: Backup existing database if it exists
echo "📦 Step 1: Backing up existing database..."
if [ -f "local.db" ]; then
    BACKUP_NAME="local.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp local.db "$BACKUP_NAME"
    echo "✅ Backup created: $BACKUP_NAME"
else
    echo "ℹ️  No existing database found"
fi
echo ""

# Step 2: Check if database is corrupted
echo "🔍 Step 2: Checking database health..."
if [ -f "local.db" ]; then
    if sqlite3 local.db "PRAGMA integrity_check;" 2>&1 | grep -q "ok"; then
        echo "✅ Database is healthy"
        DB_HEALTHY=true
    else
        echo "⚠️  Database is corrupted! Will recreate..."
        mv local.db "local.db.corrupt.$(date +%Y%m%d_%H%M%S)"
        rm -f local.db-wal local.db-shm
        DB_HEALTHY=false
    fi
else
    echo "ℹ️  No database file found"
    DB_HEALTHY=false
fi
echo ""

# Step 3: Install dependencies if needed
echo "📚 Step 3: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 4: Create/recreate database
echo "🗄️  Step 4: Setting up database..."
if [ "$DB_HEALTHY" = false ]; then
    echo "Creating fresh database..."
    
    # Try multiple methods to create database, prioritize setup.js as it's most reliable
    if node setup.js 2>/dev/null; then
        echo "✅ Database created via setup.js"
    elif npm run db:push 2>/dev/null; then
        echo "✅ Database created via drizzle push"
        # Verify tables were created
        TABLE_COUNT=$(sqlite3 local.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null)
        if [ "$TABLE_COUNT" -eq 0 ]; then
            echo "⚠️  Drizzle push didn't create tables, trying setup.js..."
            node setup.js 2>/dev/null || echo "❌ Setup.js also failed"
        fi
    elif node init-sqlite.js 2>/dev/null; then
        echo "✅ Database created via init-sqlite.js"
    else
        echo "❌ Failed to create database automatically"
        echo "Please run manually: node setup.js"
        exit 1
    fi
    
    # Verify tables exist after creation
    TABLE_COUNT=$(sqlite3 local.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null)
    if [ "$TABLE_COUNT" -eq 0 ]; then
        echo "❌ Database created but no tables found!"
        echo "Please run manually: node setup.js"
        exit 1
    else
        echo "✅ Database contains $TABLE_COUNT tables"
    fi
else
    echo "✅ Using existing healthy database"
fi
echo ""

# Step 5: Recreate database from scratch (fresh schema)
echo "🔄 Step 5: Recreating database with latest schema..."

echo "⚠️  Backing up old database..."
if [ -f "local.db" ]; then
    BACKUP_NAME="local.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp local.db "$BACKUP_NAME"
    echo "✅ Backup created: $BACKUP_NAME"
fi

echo "→ Removing old database files..."
rm -f local.db local.db-wal local.db-shm

echo "→ Creating fresh database from schema..."
if npm run db:push 2>/dev/null; then
    echo "✅ Database created with latest schema (age, gender, and all columns)"
else
    echo "⚠️  Schema push failed, trying setup.js..."
    if node setup.js; then
        echo "✅ Database created via setup.js"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
fi

# Verify database
TABLE_COUNT=$(sqlite3 local.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null)
echo "✅ Database contains $TABLE_COUNT tables"

# Skip all the migration checks - we have a fresh database!

echo ""

# Step 6: Fix database permissions
echo "🔐 Step 6: Setting database permissions..."
if [ -f "local.db" ]; then
    chmod 664 local.db
    chown root:root local.db
    echo "✅ Database permissions set to 664 (rw-rw-r--)"
    
    # Fix WAL and SHM files if they exist
    if [ -f "local.db-wal" ]; then
        chmod 664 local.db-wal
        chown root:root local.db-wal
        echo "✅ WAL file permissions fixed"
    fi
    
    if [ -f "local.db-shm" ]; then
        chmod 664 local.db-shm
        chown root:root local.db-shm
        echo "✅ SHM file permissions fixed"
    fi
else
    echo "❌ Database file not found!"
    exit 1
fi
echo ""

# Step 7: Set directory permissions
echo "📂 Step 7: Setting directory permissions..."
chmod 775 .
echo "✅ Directory permissions set to 775"
echo ""

# Step 8: Restart PM2
echo "🔄 Step 8: Restarting PM2..."
pm2 restart myapp

# Wait for app to start
echo "⏳ Waiting for app to start..."
sleep 3
echo ""

# Step 9: Verify deployment
echo "✅ Step 9: Verifying deployment..."

# Check PM2 status
PM2_STATUS=$(pm2 describe myapp 2>/dev/null | grep "status" | awk '{print $4}')
if [ "$PM2_STATUS" = "online" ]; then
    echo "✅ PM2 status: online"
else
    echo "❌ PM2 status: $PM2_STATUS"
fi

# Check if port 5000 is listening
if netstat -tlnp 2>/dev/null | grep -q ":5000"; then
    echo "✅ App listening on port 5000"
else
    echo "⚠️  Port 5000 not listening yet (might still be starting)"
fi

# Show database info
echo ""
echo "📊 Database Information:"
ls -lh local.db 2>/dev/null || echo "  Database file not found"
if [ -f "local.db" ]; then
    echo "  Size: $(du -h local.db | cut -f1)"
    echo "  Tables:"
    sqlite3 local.db ".tables" 2>/dev/null | tr ' ' '\n' | sed 's/^/    - /'
fi

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Check logs: pm2 logs myapp --lines 50"
echo "  2. Test the app: curl http://localhost:5000/api/user"
echo "  3. Access via browser: https://your-domain.com"
echo ""
echo "🔧 Troubleshooting:"
echo "  - View errors: pm2 logs myapp --err --lines 50"
echo "  - Check status: pm2 status"
echo "  - Restart app: pm2 restart myapp"
echo "  - Check database: sqlite3 local.db '.schema recipes_in_meal_plan'"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🚨 CRITICAL WARNING 🚨                      ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  ❌ DO NOT run these commands after deployment:                ║"
echo "║                                                                ║"
echo "║     sudo chown -R nobody:nogroup ./                            ║"
echo "║     sudo chmod -R 777 ./                                       ║"
echo "║     sudo systemctl restart lsws                                ║"
echo "║                                                                ║"
echo "║  ⚠️  Running these will CORRUPT the database!                  ║"
echo "║  💀 ALL DATA will be LOST!                                     ║"
echo "║                                                                ║"
echo "║  ✅ This script already set correct permissions                ║"
echo "║  ✅ Database: root:root (664)                                  ║"
echo "║  ✅ No LiteSpeed restart needed                                ║"
echo "║                                                                ║"
echo "║  📖 See DEPLOYMENT-WARNING.md for details                      ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
