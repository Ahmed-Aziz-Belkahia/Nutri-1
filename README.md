# NutriApp - Plug & Play Deployment 🚀

A complete nutrition tracking application with AI-powered features, built with React, Express, and SQLite.

## ⚡ Quick Start

### 🖥️ Local Development
```bash
git clone <your-repo-url>
cd NutriApp
npm install  # Automatically runs setup
npm run dev
```
Visit: `http://localhost:5000`

### 🌐 VPS Deployment (Ubuntu/Debian)
```bash
git clone <your-repo-url>
cd NutriApp
chmod +x deploy-vps.sh
./deploy-vps.sh
```

## 🎯 Features

- ✅ **User Authentication** - Secure login/register
- ✅ **Food Logging** - Track meals and nutrition
- ✅ **AI Meal Planning** - Smart meal recommendations
- ✅ **Recipe Management** - Create and share recipes
- ✅ **Progress Tracking** - Weight and photo progress
- ✅ **Shopping Lists** - Auto-generated from meal plans
- ✅ **Delete Account** - Complete data removal
- ✅ **Multi-language** - i18n support

## 🛠️ Manual Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Setup database and directories (automatic via postinstall)
npm run setup

# 3. Start development server
npm run dev
```

## 🚀 Production Deployment

### Option 1: Automated VPS Deployment
```bash
./deploy-vps.sh
```

### Option 2: Manual Production Setup
```bash
# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Docker (Coming Soon)
```bash
docker-compose up -d
```

## 📁 Project Structure
```
NutriApp/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   └── utils/          # Utilities
├── server/                 # Express backend
│   ├── routes.ts          # API routes
│   └── index.ts           # Server entry point
├── db/                    # Database files
│   ├── schema.ts          # Database schema
│   └── index.ts           # Database connection
├── uploads/               # User uploads
├── local.db              # SQLite database
├── .env                  # Environment variables
└── setup.js              # Automated setup
```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Required
PORT=5000
JWT_SECRET=your-secret-key-here

# Optional API Keys
OPENAI_API_KEY=your-openai-key        # For AI features
SENDGRID_API_KEY=your-sendgrid-key    # For emails
NUTRITIONIX_APP_ID=your-app-id        # For nutrition data
```

### Database
- **Type**: SQLite (local file)
- **Location**: `./local.db`
- **Migrations**: Automatic on setup
- **Backup**: Simply copy the `.db` file

## 🔒 Security Checklist

- [ ] Change `JWT_SECRET` in production
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall (allow port 5000)
- [ ] Set up reverse proxy (nginx)
- [ ] Configure SSL certificate
- [ ] Regular database backups

## 🌐 Reverse Proxy Setup (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoring

```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs nutriapp

# Monitor resources
pm2 monit

# Restart application
pm2 restart nutriapp
```

## 🔄 Updates & Maintenance

```bash
# Pull latest changes
git pull

# Update dependencies (if needed)
npm install

# Rebuild and restart
npm run build
pm2 restart nutriapp
```

## 🆘 Troubleshooting

### Common Issues

**Port 5000 already in use:**
```bash
# Find and kill the process
sudo lsof -ti:5000 | xargs sudo kill -9
```

**Database permission errors:**
```bash
# Fix permissions
chmod 664 local.db
chown $USER:$USER local.db
```

**PM2 not starting:**
```bash
# Check PM2 status
pm2 status
pm2 logs nutriapp --lines 50
```

### Log Locations
- Application logs: `pm2 logs nutriapp`
- System logs: `/var/log/`
- Database: `./local.db`

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run setup        # Run setup script
npm run deploy       # Build and start
```

### Adding Features
1. Backend: Add routes in `server/routes.ts`
2. Frontend: Add components in `client/src/`
3. Database: Update schema in `db/schema.ts`

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `DELETE /api/user/account` - Delete account

### Food & Nutrition
- `GET /api/food-logs` - Get food logs
- `POST /api/food-logs` - Add food log
- `GET /api/recipes` - Get recipes
- `POST /api/recipes` - Create recipe

[Full API documentation coming soon]

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you need help:

1. Check the troubleshooting section
2. Review the logs: `pm2 logs nutriapp`
3. Check environment configuration
4. Ensure all dependencies are installed
5. Verify system requirements

## 🎉 Success!

After deployment, your NutriApp will be running with:
- ✅ Complete database setup
- ✅ All necessary directories
- ✅ Production-ready configuration
- ✅ Process management with PM2
- ✅ Automatic restarts and monitoring

**Your app is now ready for users!** 🚀
