#!/bin/bash

# NutriAI OpenLiteSpeed VPS Deployment Script
# Domain: app.nutriai.online
# IP: 72.61.182.248

set -e

echo "🚀 NutriAI OpenLiteSpeed VPS Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
DOMAIN="app.nutriai.online"
APP_PORT=5000
APP_DIR="/var/www/nutriai"
APP_NAME="nutriapp"

# Phase 1: System Preparation
echo "═══════════════════════════════════════"
echo "Phase 1: System Preparation"
echo "═══════════════════════════════════════"
print_info "Updating system packages..."
apt update && apt upgrade -y
print_status "System updated"

# Install required packages
print_info "Installing required packages..."
apt install -y curl wget git build-essential sqlite3
print_status "Required packages installed"

# Phase 2: Install Node.js 20.x
echo ""
echo "═══════════════════════════════════════"
echo "Phase 2: Node.js 20.x Installation"
echo "═══════════════════════════════════════"
if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
    print_info "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_status "Node.js $(node -v) installed"
else
    print_status "Node.js 20.x already installed ($(node -v))"
fi

# Install PM2
echo ""
echo "═══════════════════════════════════════"
echo "Phase 3: PM2 Installation"
echo "═══════════════════════════════════════"
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    npm install -g pm2
    print_status "PM2 installed"
else
    print_status "PM2 already installed"
fi

# Phase 4: Clone Repository
echo ""
echo "═══════════════════════════════════════"
echo "Phase 4: Clone Application"
echo "═══════════════════════════════════════"
if [ -d "$APP_DIR" ]; then
    print_warning "Directory $APP_DIR exists, pulling latest changes..."
    cd $APP_DIR
    git pull origin main
else
    print_info "Cloning repository..."
    mkdir -p $(dirname $APP_DIR)
    git clone https://github.com/Ahmed-Aziz-Belkahia/Nutri-1 $APP_DIR
    cd $APP_DIR
fi
print_status "Repository ready"

# Phase 5: Environment Configuration
echo ""
echo "═══════════════════════════════════════"
echo "Phase 5: Environment Configuration"
echo "═══════════════════════════════════════"
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=your-openai-api-key
SENDGRID_API_KEY=your-sendgrid-api-key
EOF
    print_error "Please edit .env file with your actual API keys:"
    print_info "nano $APP_DIR/.env"
    read -p "Press Enter after editing .env file..."
else
    print_status ".env file exists"
fi

# Phase 6: Install Dependencies & Build
echo ""
echo "═══════════════════════════════════════"
echo "Phase 6: Install Dependencies & Build"
echo "═══════════════════════════════════════"
print_info "Installing dependencies..."
npm install
print_status "Dependencies installed"

print_info "Building application..."
npm run build
print_status "Application built"

# Phase 7: Database Setup
echo ""
echo "═══════════════════════════════════════"
echo "Phase 7: Database Setup"
echo "═══════════════════════════════════════"
if [ ! -f "local.db" ]; then
    print_info "Creating database..."
    if [ -f "generate-db-from-drizzle.js" ]; then
        node generate-db-from-drizzle.js
    else
        npm run db:push
    fi
    print_status "Database created"
else
    print_status "Database exists"
fi

# Set database permissions
chmod 664 local.db 2>/dev/null || true
[ -f "local.db-wal" ] && chmod 664 local.db-wal 2>/dev/null || true
[ -f "local.db-shm" ] && chmod 664 local.db-shm 2>/dev/null || true
print_status "Database permissions set"

# Phase 8: PM2 Configuration
echo ""
echo "═══════════════════════════════════════"
echo "Phase 8: PM2 Process Management"
echo "═══════════════════════════════════════"
print_info "Starting application with PM2..."
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
print_status "PM2 configured"

# Phase 9: OpenLiteSpeed Configuration
echo ""
echo "═══════════════════════════════════════"
echo "Phase 9: OpenLiteSpeed Configuration"
echo "═══════════════════════════════════════"

VHOST_CONF="/usr/local/lsws/conf/vhosts/$DOMAIN/vhconf.conf"
VHOST_DIR="/usr/local/lsws/conf/vhosts/$DOMAIN"

print_info "Creating virtual host configuration..."
mkdir -p $VHOST_DIR

cat > $VHOST_CONF << 'EOF'
docRoot                   $VH_ROOT/html
enableGzip                1

errorlog $VH_ROOT/logs/error.log {
  useServer               0
  logLevel                ERROR
  rollingSize             10M
}

accesslog $VH_ROOT/logs/access.log {
  useServer               0
  rollingSize             10M
  keepDays                30
}

index  {
  useServer               0
  indexFiles              index.html
}

context / {
  type                    proxy
  handler                 nodejs
  addDefaultCharset       off
}

rewrite  {
  enable                  1
  autoLoadHtaccess        1
  rules                   <<<END_rules
RewriteCond %{HTTP:Upgrade} =websocket
RewriteRule /(.*)           ws://localhost:5000/$1 [proxy,last]
RewriteCond %{HTTP:Upgrade} !=websocket
RewriteRule /(.*)           http://localhost:5000/$1 [proxy,last]
  END_rules
}
EOF

print_status "Virtual host configuration created"

# Add to httpd_config.conf if not exists
HTTPD_CONF="/usr/local/lsws/conf/httpd_config.conf"
if ! grep -q "virtualhost $DOMAIN" $HTTPD_CONF; then
    print_info "Adding virtual host to OpenLiteSpeed config..."
    cat >> $HTTPD_CONF << EOF

virtualhost $DOMAIN {
  vhRoot                  $VHOST_DIR
  configFile              $VHOST_CONF
  allowSymbolLink         1
  enableScript            1
  restrained              0
  setUIDMode              2
}

listener Default {
  address                 *:80
  secure                  0
  map                     $DOMAIN $DOMAIN
}
EOF
    print_status "Virtual host added to config"
else
    print_status "Virtual host already in config"
fi

# Create necessary directories
mkdir -p $VHOST_DIR/html
mkdir -p $VHOST_DIR/logs
print_status "Virtual host directories created"

# Restart OpenLiteSpeed
print_info "Restarting OpenLiteSpeed..."
/usr/local/lsws/bin/lswsctrl restart
print_status "OpenLiteSpeed restarted"

# Phase 10: SSL Certificate
echo ""
echo "═══════════════════════════════════════"
echo "Phase 10: SSL Certificate Setup"
echo "═══════════════════════════════════════"
print_info "Installing Certbot..."
apt install -y certbot

print_warning "SSL Certificate Setup"
echo "Before proceeding, ensure:"
echo "  1. Domain $DOMAIN points to this server (72.61.182.248)"
echo "  2. DNS has propagated (check with: dig $DOMAIN)"
echo ""
read -p "Continue with SSL setup? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    print_status "SSL certificate obtained"
    
    # Update OpenLiteSpeed to use SSL (manual step)
    print_warning "Manual SSL Configuration Required:"
    echo "  1. Login to OpenLiteSpeed WebAdmin: https://SERVER_IP:7080"
    echo "  2. Go to Listeners > Add"
    echo "  3. Create HTTPS listener on port 443"
    echo "  4. Set SSL certificate path: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  5. Set SSL key path: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo "  6. Map $DOMAIN to HTTPS listener"
else
    print_warning "Skipping SSL setup"
fi

# Phase 11: Final Verification
echo ""
echo "═══════════════════════════════════════"
echo "Phase 11: Verification & Testing"
echo "═══════════════════════════════════════"
print_info "Checking services..."

# Check PM2
if pm2 list | grep -q $APP_NAME; then
    print_status "PM2 process running"
else
    print_error "PM2 process not running"
fi

# Check port
if netstat -tuln | grep -q ":$APP_PORT "; then
    print_status "Application listening on port $APP_PORT"
else
    print_error "Application not listening on port $APP_PORT"
fi

# Check OpenLiteSpeed
if systemctl is-active --quiet lsws; then
    print_status "OpenLiteSpeed running"
else
    print_error "OpenLiteSpeed not running"
fi

echo ""
echo "═══════════════════════════════════════"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════"
echo ""
print_info "Application Status:"
pm2 list
echo ""
print_info "URLs:"
echo "  • HTTP: http://$DOMAIN"
echo "  • HTTPS: https://$DOMAIN (after SSL setup)"
echo "  • Direct: http://72.61.182.248:$APP_PORT"
echo ""
print_info "Useful Commands:"
echo "  • View logs: pm2 logs $APP_NAME"
echo "  • Restart app: pm2 restart $APP_NAME"
echo "  • OpenLiteSpeed WebAdmin: https://72.61.182.248:7080"
echo "  • Restart OpenLiteSpeed: /usr/local/lsws/bin/lswsctrl restart"
echo ""
print_warning "Next Steps:"
echo "  1. Verify DNS: dig $DOMAIN (should point to 72.61.182.248)"
echo "  2. Test HTTP: curl http://$DOMAIN"
echo "  3. Configure SSL in OpenLiteSpeed WebAdmin"
echo "  4. Test HTTPS: curl https://$DOMAIN"
echo "  5. Update .env with production API keys"
echo ""
