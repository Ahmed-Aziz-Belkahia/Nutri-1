#!/bin/bash

# JWT Authentication Migration - VPS Deployment Script
# Run this script on VPS: 146.190.166.34
# Location: /usr/local/lsws/Example/html/Nutri

echo "=========================================="
echo "JWT Authentication Migration - VPS Deploy"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/usr/local/lsws/Example/html/Nutri"
DB_PATH="$PROJECT_DIR/local.db"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${YELLOW}[1/10] Checking current directory...${NC}"
cd "$PROJECT_DIR" || { echo -e "${RED}Error: Cannot navigate to project directory${NC}"; exit 1; }
echo -e "${GREEN}✓ In project directory: $(pwd)${NC}"
echo ""

echo -e "${YELLOW}[2/10] Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup directory ready${NC}"
echo ""

echo -e "${YELLOW}[3/10] Backing up current database...${NC}"
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_DIR/local.db.backup.$TIMESTAMP"
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_DIR/local.db.backup.$TIMESTAMP${NC}"
    
    # Show backup size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/local.db.backup.$TIMESTAMP" | cut -f1)
    echo -e "${GREEN}  Backup size: $BACKUP_SIZE${NC}"
else
    echo -e "${YELLOW}⚠  No existing database found, skipping backup${NC}"
fi
echo ""

echo -e "${YELLOW}[4/10] Stopping PM2 application...${NC}"
pm2 stop myapp
echo -e "${GREEN}✓ Application stopped${NC}"
echo ""

echo -e "${YELLOW}[5/10] Pulling latest code from GitHub...${NC}"
git stash  # Stash any local changes
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

echo -e "${YELLOW}[6/10] Installing new dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}[7/10] Deleting old database...${NC}"
if [ -f "$DB_PATH" ]; then
    rm "$DB_PATH"
    echo -e "${GREEN}✓ Old database deleted${NC}"
else
    echo -e "${YELLOW}⚠  No database to delete${NC}"
fi
echo ""

echo -e "${YELLOW}[8/10] Initializing fresh database with new schema...${NC}"
# The database will be auto-created by Drizzle on first server start
# But we can also run the init script if it exists
if [ -f "init-sqlite.js" ]; then
    node init-sqlite.js
    echo -e "${GREEN}✓ Database initialized${NC}"
else
    echo -e "${YELLOW}⚠  No init script found, database will be created on server start${NC}"
fi
echo ""

echo -e "${YELLOW}[9/10] Starting PM2 application...${NC}"
pm2 start myapp
echo -e "${GREEN}✓ Application started${NC}"
echo ""

echo -e "${YELLOW}[10/10] Checking application status...${NC}"
pm2 status myapp
echo ""

echo -e "${YELLOW}Viewing application logs (last 30 lines)...${NC}"
pm2 logs myapp --lines 30 --nostream
echo ""

echo "=========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "=========================================="
echo ""
echo "🧪 Testing Checklist:"
echo "-------------------"
echo "1. Test registration:"
echo "   curl -X POST https://yourapp.com/api/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@test.com\",\"password\":\"Test123456\"}'"
echo ""
echo "2. Test login:"
echo "   curl -X POST https://yourapp.com/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@test.com\",\"password\":\"Test123456\"}' \\"
echo "     -c cookies.txt"
echo ""
echo "3. Test protected route:"
echo "   curl -X GET https://yourapp.com/api/auth/me \\"
echo "     -b cookies.txt"
echo ""
echo "📁 Database Backup Location:"
echo "   $BACKUP_DIR/local.db.backup.$TIMESTAMP"
echo ""
echo "📊 Monitor logs:"
echo "   pm2 logs myapp --lines 100"
echo ""
echo "🔄 Rollback (if needed):"
echo "   pm2 stop myapp"
echo "   cp $BACKUP_DIR/local.db.backup.$TIMESTAMP $DB_PATH"
echo "   git reset --hard HEAD~2"
echo "   npm install"
echo "   pm2 restart myapp"
echo ""
echo "=========================================="
