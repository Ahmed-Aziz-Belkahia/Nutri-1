# Daily Development Report - November 12, 2025

**Metrics:**
• 2 production commits (pending)
• 7 files modified
• ~450 lines added
• ~100 lines removed
• 0 lines documentation
• 1 critical bug fixed
• 2 major features added
• ~3 hours development time

**Major Features Implemented:**

• Fixed dashboard calorie discrepancy - replaced non-existent mealPlan.targetCalories with user profile WHO formula-based goals
• Integrated useUserProfile hook into DashboardNew component to fetch actual user calorie goals from onboarding
• Updated MacroCard component to calculate macro targets from user profile percentages (convert % to grams: protein/carbs ÷4, fat ÷9)
• Dashboard carousel now shows same calorie targets as profile page (both use userNutritionPreferences.caloriesGoal from WHO formula)
• Implemented complete password reset system with 6-digit verification codes (15-minute expiry)
• Replaced SendGrid with Nodemailer + Hostinger SMTP (support@nutriai.pl) for reliable email delivery
• Created beautiful password reset email template with gradient design, 6-digit code display, 15-minute countdown
• Built ForgotPassword page with dashboard theme - gradient header, animated elements, form validation
• Built ResetPassword page with code input (6-digit numeric), password fields with show/hide, strength validation
• Updated token generation system - generate6DigitCode() function replaces long hex tokens
• Modified JWT auth endpoints to accept "code" instead of "token", updated error messages for codes
• Added routes to App.tsx for /forgot-password and /reset-password (accessible without authentication)

**Impact:**
Before: Dashboard showed hardcoded 2500 cal target (mealPlan.targetCalories doesn't exist in DB), profile showed real user goal - causing confusion. No password reset functionality, SendGrid mock emails never sent.
After: Dashboard and profile both use WHO formula result from onboarding stored in userNutritionPreferences table. Complete password reset flow with real Hostinger SMTP emails, 6-digit codes, beautiful UI matching dashboard theme, 15-minute expiry for security ✅ 
