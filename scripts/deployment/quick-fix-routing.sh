#!/bin/bash

echo "🔧 Quick Fix: Updating Routing for Food-Log Pages"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Stop the app
print_info "Stopping application..."
pm2 stop nutriapp 2>/dev/null || true

# Build the application with the latest changes
print_info "Building application with updated routing..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check for errors."
    exit 1
fi

print_status "Build successful"

# Start the app
print_info "Starting application..."
pm2 start ecosystem.config.js
pm2 save

print_status "Application restarted with new routing"
echo ""
echo "🎉 Routing fix deployed!"
echo ""
print_info "Test the fix:"
echo "  1. Scan a meal"
echo "  2. It should redirect directly to /recipes/food-log/:id"
echo "  3. The page should load properly (not blank)"
echo ""
print_info "If still having issues, check PM2 logs:"
echo "  pm2 logs nutriapp"
