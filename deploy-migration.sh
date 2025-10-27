#!/bin/bash

# VPS Migration Script
# Run this locally to update VPS database

echo "🚀 Connecting to VPS and running migration..."

ssh root@89.116.110.161 << 'ENDSSH'
cd /usr/local/lsws/Example/html/Nutri

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "🔄 Running database migration..."
DATABASE_PATH=/usr/local/lsws/Example/html/Nutri/local.db node migrate-vps.js

echo "♻️  Restarting PM2..."
pm2 restart myapp

echo "✅ Migration complete! Checking PM2 status..."
pm2 status

echo "📋 Recent logs:"
pm2 logs myapp --lines 20 --nostream

ENDSSH

echo "✅ Done! Your VPS database has been updated."
