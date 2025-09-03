# 🚀 NutriApp - Plug & Play Installation Guide

## ⚡ Ultra-Quick Start (3 Commands)

```bash
git clone <your-repo-url>
cd NutriApp
npm install
```

**That's it!** 🎉 Your app is ready to run!

---

## 🖥️ Local Development

```bash
npm run dev
```
Visit: `http://localhost:5000`

---

## 🌐 VPS Deployment (Ubuntu/Debian)

### Option 1: Automated (Recommended)
```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Option 2: Manual
```bash
# Install Node.js & PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Deploy app
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔧 Key Features (Auto-Configured)

- ✅ **SQLite Database** - Local, no external dependencies
- ✅ **Auto-Setup** - Runs on `npm install`
- ✅ **PM2 Ready** - Production process management
- ✅ **Environment Config** - Pre-configured `.env`
- ✅ **Verification** - Built-in health checks

---

## 📊 Management Commands

```bash
npm run verify     # Check installation
npm run dev        # Development server
npm run build      # Build for production
npm run deploy     # Build + start production
pm2 status         # Check app status
pm2 logs nutriapp  # View logs
pm2 restart nutriapp # Restart app
```

---

## 🔒 Security Checklist (Production)

- [ ] Change `JWT_SECRET` in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall (port 5000)
- [ ] Set up nginx reverse proxy
- [ ] Configure SSL certificate

---

## 🆘 Quick Troubleshooting

**App won't start?**
```bash
npm run verify
npm run setup
```

**Database issues?**
```bash
rm local.db
npm run setup
```

**Port conflicts?**
```bash
# Change PORT in .env file
PORT=3000
```

---

## 📁 What Gets Created

```
NutriApp/
├── local.db              # SQLite database
├── uploads/              # User files
├── logs/                 # App logs
├── .env                  # Configuration
├── ecosystem.config.js   # PM2 config
└── dist/                 # Built files (after build)
```

---

## 🎯 API Keys (Optional)

Add to `.env` for full features:
- `OPENAI_API_KEY` - AI meal planning
- `SENDGRID_API_KEY` - Email notifications
- `NUTRITIONIX_API_KEY` - Nutrition data

App works without these keys!

---

## 🚀 Success!

Your NutriApp includes:
- User authentication & profiles
- Food logging & nutrition tracking
- AI-powered meal planning
- Recipe management
- Progress tracking
- Shopping lists
- **Account deletion feature** (complete data cleanup)

**No external database required!** Everything runs locally with SQLite.

Ready to serve users! 🎉
