# NutriAI - AI-Powered Nutrition and Calorie Tracking App

## Overview

NutriAI is a comprehensive calorie and nutrition tracking application that combines traditional food logging with AI-powered features. The application helps users meet their weight loss, weight gain, or maintenance goals through personalized meal planning, food recognition, and nutritional analysis.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack React Query for server state management
- **Mobile Optimization**: WebView-optimized with specific performance enhancements for Android/iOS apps

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based authentication
- **API Design**: RESTful endpoints with Express middleware
- **File Uploads**: Multer for handling image uploads

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Connection**: Neon serverless PostgreSQL for cloud deployment
- **Data Validation**: Zod schemas for type-safe database operations

## Key Components

### Authentication System
- User registration and login with bcrypt password hashing
- Session-based authentication with Passport.js
- Password reset functionality with time-limited tokens
- Email verification system (mock implementation)
- Admin user management with role-based access control

### AI-Powered Features
- **OpenAI Integration**: GPT-4o model for food recognition and recipe generation
- **Food Recognition**: Image-based food identification with nutritional analysis
- **Meal Planning**: AI-generated personalized meal plans based on user preferences
- **Recipe Generation**: Custom recipe creation from available ingredients
- **Body Analysis**: Body composition estimation from user photos (hypothetical assessments)

### Core Functionality
- **Food Logging**: Manual and AI-assisted food entry with macro tracking
- **Weight Tracking**: Progress monitoring with visual charts
- **Meal Planning**: Weekly meal plans with shopping list generation
- **Recipe Management**: Custom recipe creation and storage
- **Progress Photos**: Visual progress tracking with before/after comparisons
- **Gamification**: Badge system and streak tracking for user engagement

### WebView Optimizations
- **Performance**: Camera resolution optimization, debounced scroll events, lazy loading
- **Logging**: Enhanced JSON object formatting for Android WebView debugging
- **Compatibility**: Reflection warning mitigation and hardware acceleration support

## Data Flow

### User Journey
1. **Onboarding**: Comprehensive quiz to establish nutritional goals and preferences
2. **Daily Logging**: Food entry via manual input, barcode scanning, or photo recognition
3. **AI Analysis**: Automatic nutritional analysis and meal suggestions
4. **Progress Tracking**: Weight logs, progress photos, and achievement monitoring
5. **Meal Planning**: AI-generated weekly meal plans with shopping lists

### Data Processing Pipeline
1. **Image Upload**: Photos processed through OpenAI Vision API for food identification
2. **Nutritional Analysis**: Food items analyzed for calories, macros, and serving sizes
3. **Meal Plan Generation**: User preferences processed to create optimized meal plans
4. **Shopping List Creation**: Ingredients consolidated and categorized for shopping efficiency

## External Dependencies

### AI Services
- **OpenAI API**: GPT-4o model for text and vision processing
- **Google Cloud Vision**: Alternative food recognition service (configured but not actively used)

### Email Services
- **SendGrid**: Email delivery service (mock implementation for development)

### Database Services
- **Neon**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety and enhanced development experience
- **Tailwind CSS**: Utility-first CSS framework

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reload via Vite
- **Production**: Node.js server with built React frontend
- **Database**: Automated schema migrations and table creation
- **Assets**: Static file serving for uploaded images and media

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild compiles TypeScript server to `dist`
3. **Database Setup**: Automated schema creation and migration scripts
4. **Asset Management**: Upload directory creation and file handling

### Deployment Scripts
- `deploy.sh`: Comprehensive deployment preparation script
- Database migration scripts for automated schema updates
- Environment-specific configuration for development and production

## Changelog  
- June 26, 2025: Fixed meat-only diet detection and calorie distribution - added "tylko mięso" dietary type to complexity scoring, enhanced AI prompts for proper calorie-per-meal calculation, ensures high calorie targets distribute correctly across meals
- June 26, 2025: Fixed meal planning quiz dietary preference persistence - cleared contaminated meal plans and set proper vegetarian preferences to ensure accurate dietary compliance
- June 26, 2025: Fixed critical vegetarian meal generation bug - vegetarian plans were incorrectly including chicken recipes, now forces AI generation for all dietary restrictions to ensure strict dietary compliance
- June 26, 2025: Implemented optimized meal planning system - smart complexity scoring determines best generation method (templates <3s, hybrid <10s, AI-mini <20s) while maintaining accuracy and personalization
- June 26, 2025: Enhanced analyzing meal card with rich animations - floating particles, scanning lines, animated progress bars for macros, gradient backgrounds, and shimmer effects for engaging visual feedback during analysis
- June 26, 2025: Implemented instant navigation flow - AddFood now stores image data in localStorage and navigates immediately to dashboard where analyzing meal card appears instantly with progress animation
- June 26, 2025: Completely redesigned meal planning welcome with clean, simple layout - removed complex card structure, created minimal centered design matching other empty states, improved user experience significantly
- June 26, 2025: Updated meal planning welcome to match recipes page design - added white card styling, enhanced goal display with proper mapping, consistent typography and button styling for unified user experience
- June 26, 2025: Redesigned meal planning welcome layout - improved card design with clean white background, enhanced 2x2 feature grid with larger icons, better spacing and typography for professional appearance
- June 26, 2025: Enhanced picture upload with comprehensive animations - floating particles, progress overlays, real-time preview grid, spinning loaders with pulsing effects, and Polish error messages with file validation
- June 26, 2025: Fixed body analysis functionality - added fallback height handling, improved parameter parsing, and enabled successful body composition analysis with profile updates
- June 25, 2025: Enhanced food analysis animations with floating particles, scanning effects, realistic Polish progress steps, shimmer progress bars, and synchronized visual feedback across meal cards and full-screen overlay
- June 25, 2025: Modified meal analysis architecture - scanner now creates placeholder meals and navigates to dashboard, analysis happens in meal card with progress animation
- June 25, 2025: Fixed backend to skip AI analysis for placeholder meals (isAnalyzing=true flag)
- June 25, 2025: Optimized AI meal generation for speed - switched to GPT-4o-mini with parallel processing, reducing generation time from 90+ seconds to ~20 seconds while maintaining quality
- June 25, 2025: Changed system to always use AI generation for personalized meals instead of templates
- June 25, 2025: Fixed meal plan database persistence and removed jarring page refresh, implementing smooth background updates
- June 25, 2025: Implemented hybrid meal planning system that combines speed with personalization - generates customized meals in under 3 seconds while considering user preferences for cuisine, dietary restrictions, and health goals
- June 25, 2025: Added Asian cuisine templates and fast personalized meal generation to match user preferences without long AI wait times
- June 25, 2025: Fixed meal type assignment issues where meals were being saved as "other" instead of proper types (breakfast, lunch, dinner)
- June 25, 2025: Fixed array handling errors in OpenAI meal generation service to support mixed data types from user preferences
- June 25, 2025: Fixed gluten-free meal generation speed - now uses fast templates for omnivore+gluten-free instead of slow AI, reducing generation time from 40+ seconds to under 3 seconds
- June 25, 2025: Fixed weekly shopping list functionality - consolidates ingredients from all meal plans across the week and merges duplicates  
- June 25, 2025: Implemented intelligent meal plan routing - uses AI for dietary restrictions (vegetarian/vegan) and fast templates for standard meals, ensuring proper personalization without sacrificing speed
- June 25, 2025: Fixed meal plan database persistence and removed jarring page refresh, implementing smooth background updates
- June 25, 2025: Implemented hybrid meal planning system that combines speed with personalization - generates customized meals in under 3 seconds while considering user preferences for cuisine, dietary restrictions, and health goals
- June 25, 2025: Added Asian cuisine templates and fast personalized meal generation to match user preferences without long AI wait times
- June 25, 2025: Fixed meal type assignment issues where meals were being saved as "other" instead of proper types (breakfast, lunch, dinner)
- June 25, 2025: Fixed array handling errors in OpenAI meal generation service to support mixed data types from user preferences
- June 24, 2025: Fixed calorie calculation in food logging - now properly sums individual component calories instead of using zero totals from analysis result
- June 24, 2025: Fixed food recognition to return Polish text instead of English for better user experience
- June 24, 2025: Replaced slow OpenAI meal generation with fast template-based system - reduced generation time from 90+ seconds to under 1 second (later reverted due to lack of personalization)
- June 24, 2025: Removed slider component from activity level selection, keeping only clean button interface
- June 24, 2025: Added modern picker interface to activity level selection with enhanced visual feedback and mobile-friendly design
- June 24, 2025: Streamlined onboarding goal selection by removing two options to focus on core objectives (weight loss, muscle gain, health improvement)
- June 24, 2025: Fixed vision board button text overflow issues in onboarding - shortened button labels for better mobile display and consistent navigation
- June 24, 2025: Fixed vision board issues in onboarding process - added missing API endpoint, resolved data structure mismatches, and improved motivation content display
- June 24, 2025: Added comprehensive recipe preference system with difficulty, cooking time, and flavor options - always visible with clean button interface and proper Polish text display
- June 24, 2025: Fixed ingredient confirmation page text alignment issues and improved responsive layout
- June 24, 2025: Fixed body analysis dialog mobile responsiveness and positioning issues by creating custom modal with proper centering
- June 24, 2025: Removed emojis from body analysis results display for cleaner interface
- June 24, 2025: Fixed recipe detail page header layout with proper icon integration, text centering, and visual hierarchy
- June 24, 2025: Simplified progress page interface by removing camera button, keeping only upload functionality with Polish translations
- June 24, 2025: Updated progress page styling to match dashboard aesthetic with consistent backgrounds, gradients, and design elements
- June 24, 2025: Applied consistent NutriAI branding across all progress pages to match Dashboard styling
- June 14, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.