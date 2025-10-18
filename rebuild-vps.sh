#!/bin/bash

echo "========================================="
echo "🔄 Full Rebuild and Restart"
echo "========================================="
echo ""

# Stop PM2
echo "1. Stopping PM2..."
pm2 stop myapp

# Clean build artifacts
echo "2. Cleaning build artifacts..."
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf .tsx-cache/ 2>/dev/null

# Rebuild TypeScript
echo "3. Building TypeScript..."
npm run build

# Restart PM2
echo "4. Restarting PM2..."
pm2 restart myapp

echo ""
echo "✅ Rebuild complete! Waiting 3 seconds..."
sleep 3

# Test JWT
echo ""
./test-jwt-vps.sh
