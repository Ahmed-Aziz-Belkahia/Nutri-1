# Changelog

All notable changes to NutriAI are documented here.

## [Unreleased] — 2026-04

### Security
- Comprehensive security audit and hardening
- Removed all hardcoded secrets and credential fallbacks
- Re-enabled admin authorization middleware
- Fixed CORS configuration (restricted to configured origins in production)
- Replaced `Math.random()` with `crypto.randomInt()` for verification codes
- Removed JWT tokens from login response body (httpOnly cookies only)
- Sanitized error responses (no internal details in production)
- Removed debug logging of sensitive data (passwords, emails, session IDs)
- Removed `unsafe-eval` from Content Security Policy
- Cleaned exposed service account credentials from repository

### Documentation
- Professional README with architecture overview
- Added ARCHITECTURE.md with system diagrams
- Added SECURITY.md with security practices
- Organized all documentation into `docs/` hierarchy
- Organized all scripts into `scripts/` hierarchy
- Redacted leaked secrets from historical documentation

---

## [1.0] — January 2026

### Added
- JWT migration from session-based auth (complete overhaul)
- Token usage tracking and per-user rate limiting (free/premium tiers)
- Automated daily/monthly token usage reset via cron jobs
- Admin dashboard with user management and analytics

### Security
- Migrated from session-based auth to JWT + refresh tokens
- Added rate limiting on all auth endpoints
- Added `express-rate-limit` for brute-force protection

---

## December 2025

### Added
- Google OAuth 2.0 integration with account merging
- Email verification via 6-digit codes
- Password reset flow with time-limited codes
- SendGrid email integration (verification, welcome, reset emails)
- Stripe payment integration (foundation)

### Improved
- Mobile WebView optimization for Android app
- Cookie-based JWT storage for mobile compatibility

---

## November 2025

### Added
- AI-powered monitoring system (n8n + GPT-4o-mini agents)
- Attack detection and automated alerting
- VPS deployment automation (OpenLiteSpeed + PM2)
- Body composition analysis via AI
- Progress photo tracking with AI analysis

### Improved
- Meal plan generation performance (fast template system)
- Shopping list generation from meal plans
- Database schema evolution (20+ migration scripts)

---

## October 2025

### Added
- AI Food Recognition (camera-based meal scanning via OpenAI GPT-4o)
- Text-based food analysis
- Ingredient scanning and recipe generation
- AI Nutrition Coach (conversational assistant)
- Smart meal planning with dietary preference support
- Recipe management (create, save, favorite)
- Dashboard with daily nutrition tracking
- Weight and progress logging
- Streak tracking and gamification (XP, levels)
- Multi-language support (i18n)

### Technical
- React 18 + TypeScript frontend with TailwindCSS
- Express + TypeScript backend
- SQLite database with Drizzle ORM
- Radix UI component library
- Framer Motion animations
