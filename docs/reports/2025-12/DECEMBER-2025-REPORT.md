# NutriAI Development Report - December 2025

**Period:** November 25 - December 11, 2025  
**Total Commits:** 48+ (December only)  
**Summary:** Major UI/UX overhaul, AI system improvements, internationalization, bug fixes, and mobile app optimizations

---

## 🌟 Executive Summary (Last 2 Weeks Highlights)

### 🌐 Languages & Internationalization
- **Fixed mixed-language issues** throughout the app
- **Implemented language selection system** supporting 5 languages:
  - Polish 🇵🇱
  - English 🇬🇧
  - Spanish 🇪🇸
  - French 🇫🇷
  - Arabic 🇸🇦
- **Created scalable i18n framework** - new languages can be added in <2 days

### 📊 Administrative Systems
- **Built analytics system** showing:
  - Cost per user (AI token usage tracking)
  - Feature usage statistics
  - User engagement metrics
- **Improved tester management system** for adding/managing beta testers

### 🔐 Login/Registration
- **Completely rebuilt onboarding flow** from scratch
- **Fixed all email systems:**
  - Password reset
  - Account verification
  - Test invitation emails
- **Corrected calorie goal calculation formula** for accurate TDEE

### 📱 In-App Improvements
- **New logo and header text** added
- **Progress section color refresh** to match design system
- **Optimized meal plan shopping list** for better usability
- **Real-time macro recalculation** when profile changes:
  - Weight, height, age updates
  - Goal changes (lose/gain/maintain)
  - Physical activity level changes
  - Instantly recalculates: calories, protein, fats, carbohydrates
- **Weekly weight check-in popup** (appears Sundays only)
- **Added basic user information** display
- **Optimized AI features** for better accuracy and dietary safety

### 🍎 iOS App Store
- ✅ **New logo published** and live on App Store

### 🤖 Google Play Store
- ⏳ **Awaiting approval** - Submitted new logo and updated application
- Completed additional testing phases and forms required by Google
- New version will be available once approved

---

## 📅 Daily Breakdown

### December 2, 2025 (2 commits)

#### Internationalization & Onboarding
- **Complete onboarding i18n translation** for 5 languages (English, French, Spanish, Arabic, German)
- Fixed passport initialization issues
- Reduced mockup image sizes for faster loading

#### UI Redesign
- **Redesigned weight check-in popup** to match app design system
- Fixed logo styling consistency

---

### December 4, 2025 (32 commits) - Major Development Day

#### 🎨 UI/UX Overhaul

**Authentication Pages**
- Redesigned auth pages to match onboarding theme
- Made auth page more professional with refined slate color scheme
- Put signup tab first (instead of login)
- Removed bottom margin from auth page header

**Navigation & Branding**
- Removed 'Welcome to NutriAI' text from top nav - keeping only logo
- Updated to new logo design
- Added 'Welcome to NutriAI' text in header (localized)
- Made logo bigger
- Translated welcome text to all 5 languages
- Fixed header welcome translation in common.json namespace

**Progress Page**
- Restyled Progress page to match dashboard/recipes color scheme

**Goals Popup**
- Redesigned Goals popup with modern clean design

**Landing/Onboarding**
- Removed landing page entirely - made onboarding quiz the entry point
- Added auth redirect on completion
- Added language selector with emoji flags to OnboardingQuiz
- Optimized landing page for smaller phones (reduced sizes and spacing)
- Made landing page more compact for smaller phones
- Added framer-motion animations throughout new onboarding flow

#### 📊 Onboarding Improvements

**Weight Goal Visualizations**
- Updated onboarding charts to show appropriate visualizations based on weight goal:
  - **Lose weight:** Downward trending chart
  - **Gain weight:** Upward trending chart  
  - **Maintain:** Stable/flat chart

**Calorie Calculations**
- Unified calorie calculations using shared `nutrition.ts` utility everywhere
- Auto-recalculate calories when height, weight, activity level, or weight goal changes
- Auto-recalculate nutrition when activity level or weight goal changes

#### 🔐 Auth & Session Management

- Fixed routing to use new onboarding for unauthenticated users
- Navigate to auth page on Get Started button click
- Added auth check to new onboarding:
  - Redirect completed users to dashboard
  - Start authenticated users at step 1
- Added fallback redirect for authenticated users to dashboard
- **Fixed logout** - clear localStorage session flags and force redirect to auth

#### ⏰ Weekly Weight Check-in

- Fixed weekly weight check-in to only show once per 24 hours when dismissed
- Made weekly weight check-in appear **only on Sundays**

#### 🍳 Recipes & Ingredient Scanning

- Added separate section for AI-generated recipes from ingredient scanning
- **Fixed:** Save ingredient-generated recipes to recipes page instead of food logs
- **Fixed:** Update ingredient-generated recipes to query from recipes table
- Fixed navigation for ingredient recipes

#### 🔄 Data Refresh & Caching

- Fixed data refresh - invalidate all food log and recipe queries after saving

---

### December 7, 2025 (4 commits)

#### 🤖 Major AI System Overhaul

**Dietary Preferences Integration**
- Added user dietary preferences to recipe generation
- AI now respects allergies and dietary restrictions from onboarding
- Complete AI overhaul to respect user dietary preferences

**AI Service Improvements**
- Implemented **AI Service Manager** for better organization
- Added **Dietary Safety** checks to prevent allergen recommendations
- Enhanced accuracy in nutritional calculations and recipe generation

**Data Normalization**
- Fixed enum value normalization (mealType, difficulty) to lowercase in AI responses
- Prevents case mismatch errors (e.g., "Easy" vs "easy", "Snack" vs "snack")

---

### December 9, 2025 (1 commit)

#### Onboarding Refinements
- Made welcome page more compact
- Set metric as default unit system
- Improved goal-based chart visualizations
- Reduced referral options for cleaner UI

---

### December 10, 2025 (8 commits)

#### 🐛 Critical Bug Fixes

**Meal Plan & Allergies**
- Fixed meal plan creation to handle allergies and dietaryRestrictions as arrays
- Previously was failing when user had multiple allergies

**Recipe Display**
- Fixed recipes not showing: added support for filter param
- Include ingredient_generation source in recipe queries
- Fixed recipe query invalidation to use proper queryKeys structure
- Fixed invalidation of ingredient recipes query to refresh dashboard and recipes page

**Date/Timezone Issues**
- **Fixed off-by-one-day bug:** Changed from UTC `toISOString()` to local timezone
- Food was being logged on the wrong day due to timezone conversion
- Updated client-side date handling in:
  - `WeeklyWeightCheckIn.tsx`
  - `App.tsx` DataPrefetcher
  - `use-food-log.ts`
  - `EnhancedAddFood.tsx`
- Updated server-side date parsing in `routes.ts`

**Dashboard**
- Fixed: Pass selected date to useFoodLog hook in DashboardNew to log food on correct date

#### 🔓 Testing Support
- **TEMPORARY:** Bypassed all token limits for testing purposes

#### 📸 Body Analysis
- **Fixed body analysis button not working**
- Issue: Was passing photo URL instead of base64 data to API
- Solution: Added `fetchImageAsBase64()` helper to convert image URL to base64 before API call

#### 📱 Mobile App
- **Fixed fullscreen button in cooking mode** causing weird behavior in WebView
- Hide fullscreen button when running in native app (WebView is already fullscreen)
- Detects native app via `window.isNativeApp` flag

---

## 📊 Statistics

| Category | Count |
|----------|-------|
| Total Commits | 48 |
| UI/UX Changes | 18 |
| Bug Fixes | 15 |
| AI Improvements | 4 |
| Onboarding | 8 |
| Internationalization | 3 |

---

## 🔑 Key Features Delivered

### 1. Complete Onboarding Redesign
- New quiz-based onboarding flow
- 5-language support with emoji flag selector
- Goal-based chart visualizations
- Framer-motion animations
- Mobile-optimized layouts

### 2. AI Dietary Safety System
- Respects user allergies and dietary restrictions
- Normalized enum values for consistent data
- Service manager architecture
- Enhanced accuracy

### 3. Unified Date Handling
- Fixed timezone bugs causing off-by-one-day issues
- Consistent local timezone usage across app

### 4. Improved Caching System
- Centralized query keys in `queryKeys.ts`
- Proper cache invalidation after mutations
- Fixed recipe refresh issues

### 5. Mobile App Fixes
- Fixed fullscreen button in cooking mode
- Fixed body analysis photo processing

---

## 🚀 Files Modified

### Major Component Changes
- `client/src/pages/OnboardingQuiz.tsx` - New onboarding flow
- `client/src/pages/Auth.tsx` - Redesigned authentication
- `client/src/pages/UnifiedProgress.tsx` - Body analysis fix
- `client/src/pages/CookingMode.tsx` - Mobile fullscreen fix
- `client/src/pages/DashboardNew.tsx` - Date handling
- `client/src/pages/Recipes.tsx` - Ingredient recipes section

### Core Utilities
- `client/src/lib/queryKeys.ts` - Centralized query keys
- `client/src/lib/nutrition.ts` - Unified calorie calculations

### Server Changes
- `server/routes.ts` - Date parsing, recipe queries
- `server/middleware/check-token-limit.ts` - Token bypass (temp)
- `server/services/ai-service-manager.ts` - AI improvements

### Localization
- `client/src/i18n/locales/*/common.json` - All 5 languages updated

---

## ⚠️ Known Temporary Changes

1. **Token limits bypassed** - Need to re-enable after testing
   - File: `server/middleware/check-token-limit.ts`
   - Lines 22-27 contain bypass logic

---

## 📱 Deployment Notes

All changes deployed to VPS at `72.61.182.248` via:
```bash
ssh root@72.61.182.248 "cd /usr/local/lsws/Example/html/NutriApp && git pull && npm run build && pm2 restart nutriapp"
```

---

*Report generated: December 11, 2025*
