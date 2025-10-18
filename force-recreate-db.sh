#!/bin/bash

echo "🗄️  Force Recreating Database with JWT Tables..."

# Backup existing database if it exists
if [ -f "local.db" ]; then
    BACKUP_NAME="local.db.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Backing up existing database to $BACKUP_NAME"
    cp local.db "$BACKUP_NAME"
fi

# Delete all database files
echo "🗑️  Removing old database files..."
rm -f local.db local.db-shm local.db-wal

# Run setup.js to create new database
echo "🔨 Creating new database with JWT tables..."
node setup.js

# Verify JWT tables exist
echo ""
echo "🔍 Verifying JWT tables..."
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('refresh_tokens', 'user_token_limits', 'api_usage_tracking');" | while read table; do
    echo "   ✅ Found table: $table"
done

echo ""
echo "🎉 Database recreation complete!"
echo "📊 All tables in database:"
sqlite3 local.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
