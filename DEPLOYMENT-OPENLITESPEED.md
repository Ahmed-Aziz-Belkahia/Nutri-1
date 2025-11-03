# OpenLiteSpeed VPS Deployment Guide
## NutriAI Application

**VPS Details:**
- IP: 72.61.182.248
- Domain: app.nutriai.online
- OS: Ubuntu with OpenLiteSpeed
- Port: 5000 (proxied through OpenLiteSpeed on 80/443)

---

## Quick Deployment

### 1. Upload Script to VPS
```bash
scp deploy-openlitespeed.sh root@72.61.182.248:/root/
```

### 2. SSH into VPS
```bash
ssh root@72.61.182.248
```

### 3. Make Script Executable & Run
```bash
chmod +x /root/deploy-openlitespeed.sh
bash /root/deploy-openlitespeed.sh
```

---

## Manual Deployment Steps

If you prefer step-by-step control:

### Phase 1: System Preparation
```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential sqlite3
```

### Phase 2: Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # Should show v20.x
```

### Phase 3: Install PM2
```bash
npm install -g pm2
pm2 -v
```

### Phase 4: Clone Repository
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Ahmed-Aziz-Belkahia/Nutri-1 nutriai
cd nutriai
```

### Phase 5: Environment Configuration
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=sk-your-actual-key
SENDGRID_API_KEY=SG.your-actual-key
EOF

# Edit with your actual keys
nano .env
```

### Phase 6: Build Application
```bash
npm install
npm run build
```

### Phase 7: Setup Database
```bash
# Database will be created automatically
chmod 664 local.db 2>/dev/null || true
```

### Phase 8: Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
pm2 list
```

### Phase 9: Configure OpenLiteSpeed

Create virtual host configuration:
```bash
mkdir -p /usr/local/lsws/conf/vhosts/app.nutriai.online
nano /usr/local/lsws/conf/vhosts/app.nutriai.online/vhconf.conf
```

Add this content:
```apache
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
```

Add virtual host to main config:
```bash
nano /usr/local/lsws/conf/httpd_config.conf
```

Add at the end:
```apache
virtualhost app.nutriai.online {
  vhRoot                  /usr/local/lsws/conf/vhosts/app.nutriai.online
  configFile              /usr/local/lsws/conf/vhosts/app.nutriai.online/vhconf.conf
  allowSymbolLink         1
  enableScript            1
  restrained              0
  setUIDMode              2
}

listener Default {
  address                 *:80
  secure                  0
  map                     app.nutriai.online app.nutriai.online
}
```

Create directories and restart:
```bash
mkdir -p /usr/local/lsws/conf/vhosts/app.nutriai.online/html
mkdir -p /usr/local/lsws/conf/vhosts/app.nutriai.online/logs
/usr/local/lsws/bin/lswsctrl restart
```

### Phase 10: SSL Certificate

First, ensure DNS is pointing to your server:
```bash
dig app.nutriai.online  # Should show 72.61.182.248
```

Install and obtain certificate:
```bash
apt install -y certbot
certbot certonly --standalone -d app.nutriai.online
```

**Configure SSL in OpenLiteSpeed WebAdmin:**
1. Access: https://72.61.182.248:7080
2. Login with admin credentials
3. Go to: Listeners > Add
4. Create HTTPS listener:
   - Listener Name: HTTPS
   - IP Address: ANY IPv4
   - Port: 443
   - Secure: Yes
5. SSL Tab:
   - Private Key File: `/etc/letsencrypt/live/app.nutriai.online/privkey.pem`
   - Certificate File: `/etc/letsencrypt/live/app.nutriai.online/fullchain.pem`
6. Virtual Host Mappings:
   - Virtual Host: app.nutriai.online
   - Domains: app.nutriai.online
7. Save and restart

---

## Verification

### Check PM2 Process
```bash
pm2 list
pm2 logs nutriapp
```

### Check Port Listening
```bash
netstat -tuln | grep 5000
```

### Test Local Connection
```bash
curl http://localhost:5000
```

### Test Domain
```bash
curl http://app.nutriai.online
curl https://app.nutriai.online
```

### Check OpenLiteSpeed
```bash
systemctl status lsws
/usr/local/lsws/bin/lswsctrl status
```

---

## Useful Commands

### Application Management
```bash
pm2 restart nutriapp      # Restart app
pm2 stop nutriapp         # Stop app
pm2 logs nutriapp         # View logs
pm2 logs nutriapp --lines 100  # Last 100 lines
pm2 monit                 # Monitor resources
```

### OpenLiteSpeed
```bash
/usr/local/lsws/bin/lswsctrl start    # Start
/usr/local/lsws/bin/lswsctrl stop     # Stop
/usr/local/lsws/bin/lswsctrl restart  # Restart
/usr/local/lsws/bin/lswsctrl status   # Status
```

### Database
```bash
sqlite3 /var/www/nutriai/local.db
# .tables         - List tables
# .schema users   - Show table structure
# SELECT * FROM users LIMIT 5;
# .quit           - Exit
```

### Logs
```bash
# Application logs
pm2 logs nutriapp

# OpenLiteSpeed logs
tail -f /usr/local/lsws/logs/error.log
tail -f /usr/local/lsws/conf/vhosts/app.nutriai.online/logs/access.log
tail -f /usr/local/lsws/conf/vhosts/app.nutriai.online/logs/error.log
```

---

## Troubleshooting

### App not starting
```bash
pm2 logs nutriapp --err     # Check error logs
cd /var/www/nutriai
node dist/index.js          # Run directly to see errors
```

### Port 5000 already in use
```bash
lsof -i :5000
kill -9 <PID>
pm2 restart nutriapp
```

### OpenLiteSpeed not proxying
```bash
# Check virtual host config
cat /usr/local/lsws/conf/vhosts/app.nutriai.online/vhconf.conf

# Check main config
grep -A 10 "virtualhost app.nutriai.online" /usr/local/lsws/conf/httpd_config.conf

# Restart OpenLiteSpeed
/usr/local/lsws/bin/lswsctrl restart
```

### SSL certificate issues
```bash
# Check certificate
certbot certificates

# Renew certificate
certbot renew

# Test renewal
certbot renew --dry-run
```

### Database permissions
```bash
cd /var/www/nutriai
chmod 664 local.db
chmod 664 local.db-wal
chmod 664 local.db-shm
chown nobody:nogroup local.db*
```

---

## DNS Configuration

Point your domain to the VPS:

**A Record:**
```
Type: A
Name: app
Value: 72.61.182.248
TTL: 3600
```

Or for root domain:
```
Type: A
Name: @
Value: 72.61.182.248
TTL: 3600
```

Verify:
```bash
dig app.nutriai.online
nslookup app.nutriai.online
```

---

## Firewall (UFW)

```bash
# Allow required ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 7080/tcp  # OpenLiteSpeed WebAdmin
ufw enable
ufw status
```

---

## Update Deployment

To deploy new changes:
```bash
cd /var/www/nutriai
git pull origin main
npm install
npm run build
pm2 restart nutriapp
```

Or use the update script:
```bash
bash deploy-complete.sh
```

---

## Important Files

- Application: `/var/www/nutriai/`
- Database: `/var/www/nutriai/local.db`
- Environment: `/var/www/nutriai/.env`
- PM2 Config: `/var/www/nutriai/ecosystem.config.js`
- OpenLiteSpeed Config: `/usr/local/lsws/conf/httpd_config.conf`
- Virtual Host Config: `/usr/local/lsws/conf/vhosts/app.nutriai.online/vhconf.conf`
- SSL Certificates: `/etc/letsencrypt/live/app.nutriai.online/`

---

## Security Checklist

- [ ] Change default OpenLiteSpeed admin password
- [ ] Setup strong JWT_SECRET in .env
- [ ] Secure API keys (OpenAI, SendGrid)
- [ ] Enable UFW firewall
- [ ] Setup SSL certificate
- [ ] Regular backups of database
- [ ] Monitor PM2 logs for errors
- [ ] Setup log rotation
- [ ] Restrict SSH to key-based auth
- [ ] Setup fail2ban for SSH protection
