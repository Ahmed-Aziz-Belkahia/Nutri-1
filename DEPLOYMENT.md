# NutriApp - Plug & Play Deployment Guide

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run setup
npm run dev
```

### VPS Deployment (Ubuntu/Debian)
```bash
# Clone your repository
git clone <your-repo-url>
cd NutriApp

# Run the automated deployment script
chmod +x deploy.sh
./deploy.sh
```

## 🛠️ Manual VPS Setup

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Setup Application
```bash
# Install dependencies
npm install

# Run setup script (creates database, directories, etc.)
npm run setup

# Build for production
npm run build
```

### 3. Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📁 Project Structure
```
NutriApp/
├── client/          # React frontend
├── server/          # Express backend
├── db/              # Database files
├── uploads/         # User uploads
├── logs/            # Application logs
├── local.db         # SQLite database
├── .env             # Environment variables
└── setup.js         # Automated setup script
```

## 🔧 Configuration

### Environment Variables (.env)
- **PORT**: Server port (default: 5000)
- **JWT_SECRET**: Authentication secret (change in production!)
- **OPENAI_API_KEY**: For AI features (optional)
- **SENDGRID_API_KEY**: For email notifications (optional)

### API Keys (Optional)
The app works without API keys but you can add:
- OpenAI for AI meal planning
- SendGrid for email notifications
- Nutritionix for nutrition data
- Google Cloud Vision for image recognition

## 🎯 Production Checklist

- [ ] Change JWT_SECRET in .env
- [ ] Set NODE_ENV=production
- [ ] Configure firewall (open port 5000)
- [ ] Set up reverse proxy (nginx recommended)
- [ ] Configure SSL certificate
- [ ] Set up regular database backups

## 📊 Monitoring

```bash
# Check application status
pm2 status

# View logs
pm2 logs nutriapp

# Restart application
pm2 restart nutriapp

# Stop application
pm2 stop nutriapp
```

## 🔄 Updates

```bash
# Pull latest changes
git pull

# Reinstall dependencies (if package.json changed)
npm install

# Rebuild and restart
npm run build
pm2 restart nutriapp
```

## 🆘 Troubleshooting

### Database Issues
- Database is automatically created by setup script
- Located at: ./local.db
- No external database dependencies

### Port Issues
- Default port: 5000
- Change in .env: PORT=your-port
- Ensure port is open in firewall

### Permission Issues
- Ensure uploads/ directory is writable
- Check file permissions: chmod 755 uploads/

## 📞 Support

If you encounter issues:
1. Check the logs: `pm2 logs nutriapp`
2. Verify .env configuration
3. Ensure all dependencies are installed
4. Check system requirements (Node.js 18+)
