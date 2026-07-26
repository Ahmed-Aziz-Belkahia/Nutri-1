import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';

// User schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  hasCompletedOnboarding: integer("has_completed_onboarding", { mode: 'boolean' }).default(false),
  lastActivityDate: text("last_activity_date"),
  profileImage: text("profile_image"),
  preferred_language: text("preferred_language").default("en"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: integer("reset_token_expires_at", { mode: 'timestamp' }),
  isEmailVerified: integer("is_email_verified", { mode: 'boolean' }).default(false),
  verificationCode: text("verification_code"),
  verificationCodeExpiresAt: integer("verification_code_expires_at", { mode: 'timestamp' }),
  currentStreak: integer("current_streak"),
  longestStreak: integer("longest_streak"),
  experiencePoints: integer("experience_points"),
  level: integer("level"),
  isAdmin: integer("is_admin", { mode: 'boolean' }).default(false),
  
  // Google OAuth fields
  // Sign in with Apple. `appleSub` is the stable per-app user identifier from
  // the identity token; it is the only field Apple guarantees on every sign-in.
  // The email may be a private-relay address and is only sent the first time,
  // so it is stored opportunistically and never used as the join key.
  appleSub: text("apple_sub"),
  appleEmail: text("apple_email"),
  isPrivateRelayEmail: integer("is_private_relay_email", { mode: 'boolean' }).default(false),
  authProvider: text("auth_provider").default("local"), // 'local', 'apple', or 'both'
  emailVerifiedVia: text("email_verified_via"), // 'email', 'apple'
  lastLoginAt: integer("last_login_at", { mode: 'timestamp' }),
});

// Pending registrations (email verification before account creation)
export const pendingRegistrations = sqliteTable("pending_registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  verificationCode: text("verification_code").notNull(),
  verificationCodeExpiresAt: integer("verification_code_expires_at", { mode: 'timestamp' }).notNull(),
  profileData: text("profile_data", { mode: 'json' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Types and validation schemas for authentication
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = loginSchema.extend({
  profile: z.object({
    height: z.number().positive("Height must be greater than 0"),
    currentWeight: z.number().positive("Weight must be greater than 0"),
    goalWeight: z.number().positive("Goal weight must be greater than 0"),
    weightGoal: z.enum(['gain', 'loss', 'maintain']),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active']),
    calorieGoal: z.number().int().positive(),
    proteinGoal: z.number().int().positive(),
    carbsGoal: z.number().int().positive(),
    fatGoal: z.number().int().positive(),
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    mealBudget: z.enum(['low', 'medium', 'high']).optional(),
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }).optional(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type SelectUser = typeof users.$inferSelect;

// Food logs schema - Enhanced with recipe fields for unified meal/recipe model
export const foodLogs = sqliteTable("food_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  date: integer("date", { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`),
  image: text("image"),
  components: text("components", { mode: 'json' }).$type<Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string;
    quantity?: number;
    details?: any;
  }>>(),
  
  // Recipe-like fields (optional, for enhanced meal logs)
  description: text("description"),
  ingredients: text("ingredients", { mode: 'json' }).$type<Array<{
    name: string;
    quantity: number | string;
    unit: string;
    calories?: number;
  }>>(),
  instructions: text("instructions", { mode: 'json' }).$type<string[]>(),
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  servings: integer("servings").default(1),
  imageUrl: text("image_url"), // Additional URL field (image is base64)
  source: text("source").default('scanned'), // 'scanned', 'manual', 'ai-generated'
  isRecipe: integer("is_recipe", { mode: 'boolean' }).default(false),
  recipeId: integer("recipe_id").references(() => recipes.id), // Link if promoted to recipe
  cuisineType: text("cuisine_type"), // 'Italian', 'Mexican', etc.
  mealType: text("meal_type"), // 'breakfast', 'lunch', 'dinner', 'snack'
  difficulty: text("difficulty"), // 'easy', 'medium', 'hard'
  tags: text("tags", { mode: 'json' }).$type<string[]>(), // ['vegetarian', 'low-carb', etc.]
});

export const insertFoodLogSchema = createInsertSchema(foodLogs);
export const selectFoodLogSchema = createSelectSchema(foodLogs);
export type InsertFoodLog = typeof foodLogs.$inferInsert;
export type SelectFoodLog = typeof foodLogs.$inferSelect;

// User nutrition preferences schema
export const userNutritionPreferences = sqliteTable("user_nutrition_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  age: integer("age"),
  gender: text("gender"),
  currentWeight: real("current_weight").notNull(),
  goalWeight: real("goal_weight").notNull(),
  height: real("height").notNull(),
  weightGoal: text("weight_goal").notNull(),
  activityLevel: text("activity_level").notNull(),
  caloriesGoal: integer("daily_calorie_goal").notNull(),
  proteinGoal: integer("protein_goal_percentage").notNull(),
  carbsGoal: integer("carbs_goal_percentage").notNull(),
  fatGoal: integer("fat_goal_percentage").notNull(),
  bodyFatPercentage: real("body_fat_percentage"),
  bodyType: text("body_type"),
  dietaryRestrictions: text("dietary_restrictions", { mode: 'json' }).$type<string[]>(),
  allergies: text("allergies", { mode: 'json' }).$type<string[]>(),
  mealBudget: text("meal_budget"),
  experienceLevel: text("experience_level"),
  // New fields for enhanced onboarding
  weightLossSpeed: real("weight_loss_speed"), // kg per week
  weightGainSpeed: real("weight_gain_speed"), // kg per week  
  obstacles: text("obstacles", { mode: 'json' }).$type<string[]>(), // ['busy_schedule', 'motivation', etc.]
  accomplishments: text("accomplishments", { mode: 'json' }).$type<string[]>(), // ['healthier', 'energy', etc.]
  referralSource: text("referral_source"), // 'tiktok', 'instagram', etc.
  hasUsedOtherApps: integer("has_used_other_apps", { mode: 'boolean' }),
  birthMonth: text("birth_month"),
  birthDay: integer("birth_day"),
  birthYear: integer("birth_year"),
  isMetric: integer("is_metric", { mode: 'boolean' }).default(true),
  workoutFrequency: text("workout_frequency"), // '0-2', '3-5', '6+' - raw user input
  heightFeet: integer("height_feet"), // Store original imperial values
  heightInches: integer("height_inches"),
  weightLbs: real("weight_lbs"), // Store original imperial weight
  goalWeightLbs: real("goal_weight_lbs"), // Store original imperial goal weight
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const insertUserNutritionPreferencesSchema = createInsertSchema(userNutritionPreferences);
export const selectUserNutritionPreferencesSchema = createSelectSchema(userNutritionPreferences);
export type InsertUserNutritionPreferences = typeof userNutritionPreferences.$inferInsert;
export type SelectUserNutritionPreferences = typeof userNutritionPreferences.$inferSelect;

// Recipes schema
export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  ingredients: text("ingredients", { mode: 'json' }).$type<string[]>().notNull(),
  instructions: text("instructions", { mode: 'json' }).$type<string[]>().notNull(),
  nutritionInfo: text("nutrition_info", { mode: 'json' }).$type<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  imageUrl: text("image_url"),
  rating: real("rating").default(0),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  isPublic: integer("is_public", { mode: 'boolean' }).default(false),
  isSaved: integer("is_saved", { mode: 'boolean' }).default(false),
  source: text("source").default("created"),
  originalRecipeId: integer("original_recipe_id"),
});

// Password reset tokens schema
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: integer("expires_at", { mode: 'timestamp' }).notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  usedAt: integer("used_at", { mode: 'timestamp' }),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  foodLogs: many(foodLogs),
  recipes: many(recipes),
  nutritionPreferences: many(userNutritionPreferences),
  passwordResetTokens: many(passwordResetTokens),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Types and validation schemas
export type Recipe = typeof recipes.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type UserNutritionPreferences = typeof userNutritionPreferences.$inferSelect;
export type User = typeof users.$inferSelect;

export const insertRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().optional(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  nutritionInfo: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).optional(),
  imageUrl: z.string().optional(),
  isPublic: z.boolean().default(true),
});


export type InsertRecipe = z.infer<typeof insertRecipeSchema>;

// Refresh tokens schema (for JWT authentication)
export const refreshTokens = sqliteTable("refresh_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at").notNull(), // Unix timestamp in seconds
  isRevoked: integer("is_revoked", { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s', 'now'))`), // Unix timestamp in seconds
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens);
export const selectRefreshTokenSchema = createSelectSchema(refreshTokens);
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
export type SelectRefreshToken = typeof refreshTokens.$inferSelect;

// API usage tracking schema (for token limitations and rate limiting)
export const apiUsageTracking = sqliteTable("api_usage_tracking", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text("endpoint").notNull(), // e.g., "/api/meal-plans", "/api/analyze-body-fat"
  tokensUsed: integer("tokens_used").notNull().default(0), // OpenAI tokens consumed
  costUsd: real("cost_usd").notNull().default(0), // Estimated cost in USD
  requestDate: integer("request_date").notNull().default(sql`(strftime('%s', 'now'))`), // Unix timestamp in seconds
  model: text("model"), // e.g., "gpt-4o-mini", "gpt-4o"
  status: text("status").notNull().default("success"), // success, error, rate_limited
  metadata: text("metadata", { mode: 'json' }).$type<{
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    responseTime?: number;
    errorMessage?: string;
  }>(),
});

export const insertApiUsageTrackingSchema = createInsertSchema(apiUsageTracking);
export const selectApiUsageTrackingSchema = createSelectSchema(apiUsageTracking);
export type InsertApiUsageTracking = typeof apiUsageTracking.$inferInsert;
export type SelectApiUsageTracking = typeof apiUsageTracking.$inferSelect;

// User token limits schema (for premium tiers and usage limits)
export const userTokenLimits = sqliteTable("user_token_limits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  tier: text("tier").notNull().default("free"), // free, premium, enterprise
  dailyTokenLimit: integer("daily_token_limit").notNull().default(10000), // Tokens per day
  monthlyTokenLimit: integer("monthly_token_limit").notNull().default(200000), // Tokens per month
  dailyUsed: integer("daily_used").notNull().default(0),
  monthlyUsed: integer("monthly_used").notNull().default(0),
  lastResetDaily: integer("last_reset_daily", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  lastResetMonthly: integer("last_reset_monthly", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const insertUserTokenLimitsSchema = createInsertSchema(userTokenLimits);
export const selectUserTokenLimitsSchema = createSelectSchema(userTokenLimits);
export type InsertUserTokenLimits = typeof userTokenLimits.$inferInsert;
export type SelectUserTokenLimits = typeof userTokenLimits.$inferSelect;
