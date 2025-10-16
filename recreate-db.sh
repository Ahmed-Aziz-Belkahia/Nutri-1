#!/bin/bash

# Script to completely recreate the database from scratch
# WARNING: This will DELETE ALL DATA!

echo "🗑️  Recreating database from scratch..."
echo ""
echo "⚠️  WARNING: This will DELETE ALL existing data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "📦 Step 1: Backing up old database (just in case)..."
if [ -f "local.db" ]; then
    BACKUP_NAME="local.db.backup.$(date +%Y%m%d_%H%M%S)"
    cp local.db "$BACKUP_NAME"
    echo "✅ Backup created: $BACKUP_NAME"
fi

echo ""
echo "🗑️  Step 2: Removing old database files..."
rm -f local.db
rm -f local.db-wal
rm -f local.db-shm
echo "✅ Old database files removed"

echo ""
echo "🏗️  Step 3: Creating fresh database with current schema..."
if npm run db:push; then
    echo "✅ Database created successfully"
else
    echo "❌ Database creation failed"
    echo "Trying alternative method..."
    if node setup.js; then
        echo "✅ Database created via setup.js"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
fi

echo ""
echo "🔍 Step 4: Verifying database..."
TABLE_COUNT=$(sqlite3 local.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null)
echo "✅ Database contains $TABLE_COUNT tables"

echo ""
echo "📊 Step 5: Listing all tables..."
sqlite3 local.db ".tables"

echo ""
echo "🎉 Database recreated successfully!"
echo ""
echo "📝 Note: All data has been wiped. You'll need to:"
echo "   1. Create a new user account"
echo "   2. Complete onboarding"
echo "   3. Start fresh"
echo ""
