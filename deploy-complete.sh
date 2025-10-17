#!/bin/bash

# Complete deployment script for Nutri-AI
# Database is managed separately

set -e

echo "🚀 Complete Deployment Starting..."
echo ""

# Install dependencies
echo "📦 Step 1/4: Installing dependencies..."
npm install
echo "✅ Done"
echo ""

# Build application
echo "🏗️  Step 2/4: Building application..."
npm run build
echo "✅ Done"
echo ""

# Check database schema and recreate if corrupted
echo "🔍 Step 3/5: Checking database schema..."
if [ -f "local.db" ]; then
    # Check for the critical 'order' column (not 'order_num')
    ORDER_CHECK=$(sqlite3 local.db "PRAGMA table_info(recipes_in_meal_plan);" 2>/dev/null | grep -c "order|INTEGER" || echo "0")
    # Check for age column
    AGE_CHECK=$(sqlite3 local.db "PRAGMA table_info(user_nutrition_preferences);" 2>/dev/null | grep -c "age|INTEGER" || echo "0")
    
    if [ "$ORDER_CHECK" -eq "0" ] || [ "$AGE_CHECK" -eq "0" ]; then
        echo "⚠️  Database schema is outdated or corrupted"
        echo "🗑️  Recreating database with correct schema..."
        rm -f local.db local.db-wal local.db-shm
        node force-recreate-db.js
        echo "✅ Database recreated successfully"
    else
        echo "✅ Database schema is correct"
    fi
else
    echo "⚠️  No database found, creating new one..."
    node force-recreate-db.js
    echo "✅ Database created"
fi
echo ""

# Set permissions
echo "🔐 Step 4/5: Setting permissions..."
if [ -f "local.db" ]; then
    chmod 664 local.db 2>/dev/null || true
    [ -f "local.db-wal" ] && chmod 664 local.db-wal 2>/dev/null || true
    [ -f "local.db-shm" ] && chmod 664 local.db-shm 2>/dev/null || true
    echo "✅ Database permissions set"
fi
echo ""

# Restart PM2
echo "🔄 Step 5/5: Restarting PM2..."
if pm2 list | grep -q "myapp"; then
    pm2 restart myapp
    pm2 save
    echo "✅ PM2 restarted"
else
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ PM2 started"
fi
echo ""

# Show status
echo "📊 Application Status:"
pm2 list | grep myapp || echo "⚠️  Not found"
echo ""

echo "🎉 Deployment Complete!"
echo ""
echo "📝 Next steps:"
echo "   • View logs: pm2 logs myapp"
echo "   • Check status: pm2 status"
echo ""
