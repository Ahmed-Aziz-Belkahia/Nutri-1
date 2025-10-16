#!/bin/bash

echo "🚀 NutriApp VPS Deployment Script"
echo "================================="

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run setup
echo "🔧 Running setup..."
npm run setup

# Push database schema changes (drizzle-kit will apply all schema updates)
echo "🗄️  Applying database schema changes..."
npm run db:push

# Run any custom migrations (for backward compatibility)
if [ -f "add-age-gender-migration.js" ]; then
    echo "🔧 Running custom migrations..."
    node add-age-gender-migration.js
fi

# Build the application
echo "🏗️  Building application..."
npm run build

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 stop nutriapp 2>/dev/null || true
pm2 delete nutriapp 2>/dev/null || true
pm2 start dist/index.js --name "nutriapp"
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Your NutriApp should be running on port 5000"
echo "📊 Monitor with: pm2 status"
echo "📝 View logs with: pm2 logs nutriapp"
