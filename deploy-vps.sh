#!/bin/bash

echo "🚀 NutriApp VPS Deployment Script"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Please don't run this script as root"
    exit 1
fi

# Update system packages
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System packages updated"

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "Node.js installed"
else
    print_status "Node.js is already installed ($(node --version))"
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    sudo npm install -g pm2
    print_status "PM2 installed"
else
    print_status "PM2 is already installed"
fi

# Install dependencies
print_info "Installing dependencies..."
npm install
print_status "Dependencies installed"

# Build the application
print_info "Building application..."
npm run build
print_status "Application built"

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    print_info "Creating PM2 ecosystem config..."
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nutriapp',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF
    print_status "PM2 ecosystem config created"
fi

# Start with PM2
print_info "Starting application with PM2..."
pm2 stop nutriapp 2>/dev/null || true
pm2 delete nutriapp 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "Deployment complete!"
echo ""
echo "🎉 Your NutriApp is now running!"
echo ""
print_info "Application URL: http://your-server-ip:5000"
print_info "Monitor with: pm2 status"
print_info "View logs with: pm2 logs nutriapp"
print_info "Restart with: pm2 restart nutriapp"
echo ""
print_warning "Don't forget to:"
echo "  1. Configure your firewall to allow port 5000"
echo "  2. Set up a reverse proxy (nginx) for production"
echo "  3. Configure SSL certificate"
echo "  4. Update JWT_SECRET in .env file"
