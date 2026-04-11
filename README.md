# NutriAI — AI-Powered Nutrition Tracking Platform

NutriAI is a full-stack nutrition and wellness tracking application that leverages artificial intelligence to help users achieve their dietary goals through intelligent food recognition, personalized meal planning, and AI-coached nutrition guidance.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, TailwindCSS, Radix UI, Framer Motion |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | SQLite (development) / PostgreSQL (production), Drizzle ORM |
| **AI/ML** | OpenAI GPT-4o (food analysis, meal planning, coaching), Google Cloud Vision |
| **Auth** | JWT (access + refresh tokens), Google OAuth 2.0, bcrypt/scrypt |
| **Email** | SendGrid (verification, password reset, notifications) |
| **Monitoring** | Custom n8n workflow with AI-powered anomaly detection |
| **Deployment** | VPS, OpenLiteSpeed, PM2, Let's Encrypt SSL |

## Features

- 📸 **AI Food Recognition** — Scan meals with your camera for instant nutritional breakdown
- 🍽️ **Smart Meal Planning** — AI-generated meal plans based on dietary preferences, budget, and goals
- 🤖 **AI Nutrition Coach** — Conversational AI assistant for nutrition guidance
- 📊 **Progress Tracking** — Weight logs, body composition analysis, streak tracking
- 🛒 **Shopping Lists** — Auto-generated shopping lists from meal plans
- 👨‍🍳 **Recipe Generation** — AI-created recipes from available ingredients
- 🌍 **Multi-language** — i18n support with multiple language options
- 📱 **Mobile-Ready** — Responsive design with WebView-optimized mobile experience

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys and secrets

# 3. Start development server
npm run dev
```

The app will be available at `http://localhost:5000`.

## Environment Variables

See [.env.example](.env.example) for the complete list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for AI features |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `SENDGRID_API_KEY` | Optional | SendGrid for transactional emails |
| `MONITORING_API_KEY` | Optional | Key for monitoring endpoints |

## Project Structure

```
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page-level components
│       ├── hooks/          # Custom React hooks
│       ├── i18n/           # Internationalization
│       └── utils/          # Client utilities
├── server/                 # Express backend
│   ├── routes/             # Route handlers (auth, admin, AI, monitoring)
│   ├── services/           # Business logic (AI, email, food recognition)
│   ├── middleware/         # Auth, rate limiting, token checks
│   ├── utils/              # JWT, token management
│   └── lib/                # External service integrations
├── db/                     # Database schema and migrations
├── docs/                   # Documentation
│   ├── architecture/       # System architecture docs
│   ├── deployment/         # Deployment guides
│   ├── features/           # Feature implementation docs
│   ├── reports/            # Development reports
│   ├── security/           # Security documentation
│   └── internal/           # Internal engineering docs
├── scripts/                # Utility scripts
│   ├── migrations/         # Database migration scripts
│   ├── deployment/         # Deploy automation
│   ├── database/           # DB management scripts
│   └── testing/            # Test scripts
└── public/                 # Static assets
```

## Architecture

See [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for a detailed system overview.

## Security

See [SECURITY.md](SECURITY.md) for security practices and responsible disclosure.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push schema changes to database |

## License

MIT
