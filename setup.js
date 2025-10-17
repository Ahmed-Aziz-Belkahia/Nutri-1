#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up NutriApp for deployment...\n');

// Step 1: Create necessary directories
const createDirectories = () => {
  console.log('📁 Creating necessary directories...');
  const directories = ['uploads', 'logs', 'db'];
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✅ Created: ${dir}/`);
    } else {
      console.log(`   ✅ Exists: ${dir}/`);
    }
  });
  console.log('');
};

// Step 2: Initialize SQLite database
const initializeDatabase = () => {
  console.log('🗄️  Initializing SQLite database...');
  
  const dbPath = path.join(__dirname, 'local.db');
  
  // Check if database already exists with tables
  if (fs.existsSync(dbPath)) {
    try {
      const sqlite = new Database(dbPath);
      const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      sqlite.close();
      
      if (tables.length > 5) {
        console.log('   ✅ Database already exists with tables, skipping initialization...\n');
        return;
      }
    } catch (error) {
      console.log('   ⚠️  Existing database appears corrupted, recreating...');
    }
  }
  
  const sqlite = new Database(dbPath);
  
  const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    has_completed_onboarding INTEGER DEFAULT false,
    last_activity_date TEXT,
    profile_image TEXT,
    preferred_language TEXT DEFAULT 'en',
    reset_token TEXT,
    reset_token_expires_at INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    experience_points INTEGER,
    level INTEGER,
    is_admin INTEGER DEFAULT false
);

-- Food logs table
CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL,
    date INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    image TEXT,
    components TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User nutrition preferences table
CREATE TABLE IF NOT EXISTS user_nutrition_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    height REAL NOT NULL,
    current_weight REAL NOT NULL,
    goal_weight REAL NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    weight_goal TEXT NOT NULL,
    activity_level TEXT NOT NULL,
    calorie_goal INTEGER NOT NULL,
    protein_goal INTEGER NOT NULL,
    carbs_goal INTEGER NOT NULL,
    fat_goal INTEGER NOT NULL,
    meal_budget TEXT,
    experience_level TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Weight logs table
CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    notes TEXT,
    logged_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    nutrition_info TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    image_url TEXT,
    rating REAL DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT false,
    is_saved INTEGER DEFAULT false,
    source TEXT DEFAULT 'created',
    original_recipe_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recipe likes table
CREATE TABLE IF NOT EXISTS recipe_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Recipe comments table
CREATE TABLE IF NOT EXISTS recipe_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Progress photos table
CREATE TABLE IF NOT EXISTS progress_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    photo_url TEXT NOT NULL,
    caption TEXT,
    type TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User dietary preferences table
CREATE TABLE IF NOT EXISTS user_dietary_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    allergies TEXT,
    dietary_type TEXT NOT NULL,
    calorie_target INTEGER NOT NULL,
    meals_per_day INTEGER NOT NULL,
    preferred_ingredients TEXT,
    excluded_ingredients TEXT,
    max_cooking_time INTEGER,
    budget_preference TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    total_calories INTEGER NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Junction table for recipes in meal plans
CREATE TABLE IF NOT EXISTS recipes_in_meal_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    meal_type TEXT NOT NULL,
    serving_size REAL DEFAULT 1.0 NOT NULL,
    "order" INTEGER DEFAULT 0 NOT NULL,
    is_frozen INTEGER DEFAULT true,
    is_completed INTEGER DEFAULT false,
    completed_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Shopping list items table
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity TEXT NOT NULL,
    is_checked INTEGER DEFAULT false,
    custom_image TEXT,
    category TEXT DEFAULT 'other',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    meal_plan_id INTEGER,
    unit TEXT,
    ingredient TEXT,
    is_purchased INTEGER DEFAULT false,
    meal_type TEXT,
    recipe_name TEXT,
    recipe_image TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    used_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    requirement TEXT NOT NULL
);

-- User badges junction table
CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    earned_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (badge_id) REFERENCES badges(id)
);

-- Daily progress tracking
CREATE TABLE IF NOT EXISTS daily_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    calories_logged INTEGER DEFAULT false,
    water_logged INTEGER DEFAULT false,
    exercise_logged INTEGER DEFAULT false,
    weight_logged INTEGER DEFAULT false,
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT false,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    scheduled_for INTEGER,
    data TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

  try {
    const statements = createTablesSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      sqlite.exec(statement);
    }
    
    console.log('   ✅ Database tables created successfully');
    
    // Test the database connection
    const testResult = sqlite.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('   ✅ Database connection test passed');
    
  } catch (error) {
    console.error('   ❌ Error creating database:', error.message);
    process.exit(1);
  } finally {
    sqlite.close();
  }
  console.log('');
};

// Step 3: Check and create .env file
const setupEnvironment = () => {
  console.log('🔧 Setting up environment configuration...');
  
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  // Create .env.example if it doesn't exist
  if (!fs.existsSync(envExamplePath)) {
    const envExampleContent = `# NutriApp Environment Configuration

# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration (SQLite - Local)
# No configuration needed for SQLite

# AI Service API Keys (Optional - for AI features)
ANTHROPIC_API_KEY=""
VITE_ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
VITE_OPENAI_API_KEY=""

# Google Cloud Vision API (Optional - for image recognition)
VITE_GOOGLE_CLOUD_KEY_PATH=""
GOOGLE_APPLICATION_CREDENTIALS=""
GOOGLE_CLOUD_VISION_CREDENTIALS=""

# Nutritionix API (Optional - for nutrition data)
NUTRITIONIX_APP_ID=""
NUTRITIONIX_API_KEY=""

# Authentication Secret (IMPORTANT - Change this!)
JWT_SECRET=nutri_ai_jwt_secret_key_for_auth_change_this_in_production

# Email Configuration (Optional - for notifications)
SENDGRID_API_KEY=""

# CORS and Security Settings
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
`;
    fs.writeFileSync(envExamplePath, envExampleContent);
    console.log('   ✅ Created .env.example');
  }
  
  // Create .env from .env.example if it doesn't exist
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✅ Created .env from template');
    console.log('   ⚠️  Remember to update your API keys in .env for full functionality');
  } else {
    console.log('   ✅ .env file already exists');
  }
  console.log('');
};

// Step 4: Create startup scripts
const createStartupScripts = () => {
  console.log('🚀 Creating startup scripts...');
  
  // Update package.json scripts
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add/update scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "setup": "node setup.js",
      "dev": "tsx server/index.ts",
      "start": "NODE_ENV=production node dist/index.js",
      "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
      "deploy": "npm run setup && npm run build && npm run start"
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✅ Updated package.json scripts');
  }
  
  // Create a simple deployment script for VPS
  const deployScript = `#!/bin/bash

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
`;
  
  fs.writeFileSync(path.join(__dirname, 'deploy.sh'), deployScript);
  console.log('   ✅ Created deploy.sh script');
  
  // Create PM2 ecosystem file
  const pm2Config = {
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
  
  fs.writeFileSync(path.join(__dirname, 'ecosystem.config.js'), 
    `module.exports = ${JSON.stringify(pm2Config, null, 2)};`);
  console.log('   ✅ Created PM2 ecosystem config');
  console.log('');
};

// Step 5: Create README for deployment
const createDeploymentDocs = () => {
  console.log('📚 Creating deployment documentation...');
  
  const readmeContent = `# NutriApp - Plug & Play Deployment Guide

## 🚀 Quick Start

### Local Development
\`\`\`bash
npm install
npm run setup
npm run dev
\`\`\`

### VPS Deployment (Ubuntu/Debian)
\`\`\`bash
# Clone your repository
git clone <your-repo-url>
cd NutriApp

# Run the automated deployment script
chmod +x deploy.sh
./deploy.sh
\`\`\`

## 🛠️ Manual VPS Setup

### 1. Install Dependencies
\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
\`\`\`

### 2. Setup Application
\`\`\`bash
# Install dependencies
npm install

# Run setup script (creates database, directories, etc.)
npm run setup

# Build for production
npm run build
\`\`\`

### 3. Start Application
\`\`\`bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
\`\`\`

## 📁 Project Structure
\`\`\`
NutriApp/
├── client/          # React frontend
├── server/          # Express backend
├── db/              # Database files
├── uploads/         # User uploads
├── logs/            # Application logs
├── local.db         # SQLite database
├── .env             # Environment variables
└── setup.js         # Automated setup script
\`\`\`

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

\`\`\`bash
# Check application status
pm2 status

# View logs
pm2 logs nutriapp

# Restart application
pm2 restart nutriapp

# Stop application
pm2 stop nutriapp
\`\`\`

## 🔄 Updates

\`\`\`bash
# Pull latest changes
git pull

# Reinstall dependencies (if package.json changed)
npm install

# Rebuild and restart
npm run build
pm2 restart nutriapp
\`\`\`

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
1. Check the logs: \`pm2 logs nutriapp\`
2. Verify .env configuration
3. Ensure all dependencies are installed
4. Check system requirements (Node.js 18+)
`;

  fs.writeFileSync(path.join(__dirname, 'DEPLOYMENT.md'), readmeContent);
  console.log('   ✅ Created DEPLOYMENT.md');
  console.log('');
};

// Main execution
const main = async () => {
  try {
    createDirectories();
    initializeDatabase();
    setupEnvironment();
    createStartupScripts();
    createDeploymentDocs();
    
    console.log('🎉 Setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Update API keys in .env (optional)');
    console.log('   2. Run: npm run dev (local development)');
    console.log('   3. Or run: ./deploy.sh (VPS deployment)');
    console.log('');
    console.log('🌐 Your NutriApp will be available at: http://localhost:5000');
    console.log('📚 See DEPLOYMENT.md for full deployment guide');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

main();
