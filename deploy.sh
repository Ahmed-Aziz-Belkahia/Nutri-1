#!/bin/bash

# Simple deployment script for Nutri-AI
# Database management is done manually with: node emergency-create-db.js

set -e  # Exit on error

echo "� Deploying Nutri-AI..."
echo ""

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Done"
echo ""

# Step 2: Build application  
echo "🏗️  Building application..."
npm run build
echo "✅ Done"
echo ""

# Step 3: Set permissions (if database exists)
if [ -f "local.db" ]; then
    echo "� Setting database permissions..."
    chmod 664 local.db 2>/dev/null || true
    [ -f "local.db-wal" ] && chmod 664 local.db-wal 2>/dev/null || true
    [ -f "local.db-shm" ] && chmod 664 local.db-shm 2>/dev/null || true
    echo "✅ Done"
    echo ""
fi

# Step 4: Restart PM2
echo "� Restarting PM2..."
if pm2 list | grep -q "myapp"; then
    pm2 restart myapp
else
    pm2 start ecosystem.config.js
    pm2 save
fi
echo "✅ Done"
echo ""

echo "🎉 Deployment complete!"
echo ""
echo "📝 Useful commands:"
echo "   • View logs: pm2 logs myapp"
echo "   • Check status: pm2 status"
echo "   • Recreate DB: node emergency-create-db.js"
echo ""
