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

# Set permissions
echo "🔐 Step 3/4: Setting permissions..."
if [ -f "local.db" ]; then
    chmod 664 local.db 2>/dev/null || true
    [ -f "local.db-wal" ] && chmod 664 local.db-wal 2>/dev/null || true
    [ -f "local.db-shm" ] && chmod 664 local.db-shm 2>/dev/null || true
    echo "✅ Database permissions set"
else
    echo "⚠️  No database found - run: node emergency-create-db.js"
fi
echo ""

# Restart PM2
echo "🔄 Step 4/4: Restarting PM2..."
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
echo "   • Create database: node emergency-create-db.js"
echo "   • Check status: pm2 status"
echo ""
