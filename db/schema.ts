import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false),
  lastActivityDate: date("last_activity_date"),
  profileImage: text("profile_image"),
  preferred_language: text("preferred_language").default("en"),
  // We include these fields in the schema for password reset functionality
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  // Additional columns found in the database
  currentStreak: integer("current_streak"),
  longestStreak: integer("longest_streak"),
  experiencePoints: integer("experience_points"),
  level: integer("level"),
  isAdmin: boolean("is_admin").default(false),
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

// Food logs schema with proper decimal precision
export const foodLogs = pgTable("food_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  calories: decimal("calories", { precision: 10, scale: 2 }).notNull(),
  protein: decimal("protein", { precision: 10, scale: 2 }).notNull(),
  carbs: decimal("carbs", { precision: 10, scale: 2 }).notNull(),
  fat: decimal("fat", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  image: text("image"),
  components: jsonb("components").$type<Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string;
    quantity?: number;
    details?: {
      type?: string;
      cut?: string;
      cookingMethod?: string;
      doneness?: string;
      texture?: string;
      temperature?: string;
      color?: string;
      accompaniments?: string[];
      sauce?: string;
      seasonings?: string[];
      garnishes?: string[];
      presentation?: string;
      preparation?: string;
      estimatedWeight?: string;
    };
  }>>(),
});

// Add schema validation with proper types
export const insertFoodLogSchema = createInsertSchema(foodLogs);
export const selectFoodLogSchema = createSelectSchema(foodLogs);
export type InsertFoodLog = typeof foodLogs.$inferInsert;
export type SelectFoodLog = typeof foodLogs.$inferSelect;

// User nutrition preferences schema with proper types
export const userNutritionPreferences = pgTable("user_nutrition_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  currentWeight: decimal("current_weight", { precision: 5, scale: 2 }).notNull(),
  goalWeight: decimal("goal_weight", { precision: 5, scale: 2 }).notNull(),
  height: decimal("height", { precision: 5, scale: 2 }).notNull(), // in cm
  weightGoal: text("weight_goal").notNull(), // 'gain', 'loss', 'maintain'
  activityLevel: text("activity_level").notNull(), // 'sedentary', 'light', 'moderate', 'very_active'
  caloriesGoal: integer("daily_calorie_goal").notNull(),  // Fixed to match actual DB column name
  proteinGoal: integer("protein_goal_percentage").notNull(),  // Fixed to match actual DB column name
  carbsGoal: integer("carbs_goal_percentage").notNull(),     // Fixed to match actual DB column name
  fatGoal: integer("fat_goal_percentage").notNull(),         // Fixed to match actual DB column name
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 5, scale: 2 }),
  bodyType: text("body_type"),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>().default([]),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  mealBudget: text("meal_budget"), // 'low', 'medium', 'high'
  experienceLevel: text("experience_level"), // 'beginner', 'intermediate', 'advanced'
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Add validation schemas for user nutrition preferences
export const insertUserNutritionPreferencesSchema = createInsertSchema(userNutritionPreferences);
export const selectUserNutritionPreferencesSchema = createSelectSchema(userNutritionPreferences);
export type InsertUserNutritionPreferences = typeof userNutritionPreferences.$inferInsert;
export type SelectUserNutritionPreferences = typeof userNutritionPreferences.$inferSelect;

// Weight logs schema
export const weightLogs = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});

export const insertWeightLogSchema = createInsertSchema(weightLogs);
export const selectWeightLogSchema = createSelectSchema(weightLogs);
export type InsertWeightLog = typeof weightLogs.$inferInsert;
export type SelectWeightLog = typeof weightLogs.$inferSelect;

// Recipes schema
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  ingredients: jsonb("ingredients").$type<string[]>().notNull(),
  instructions: jsonb("instructions").$type<string[]>().notNull(),
  nutritionInfo: jsonb("nutrition_info").$type<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  imageUrl: text("image_url"),
  rating: decimal("rating").default("0"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  isPublic: boolean("is_public").default(false),
  isSaved: boolean("is_saved").default(false),
  source: text("source").default("created"), // 'created' or 'saved'
  originalRecipeId: integer("original_recipe_id"), // For tracking the source recipe if saved
});

// Recipe likes schema
export const recipeLikes = pgTable("recipe_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Recipe comments schema
export const recipeComments = pgTable("recipe_comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// New table for badges/achievements
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  requirement: jsonb("requirement").$type<{
    type: 'weight_goal' | 'meal_variety';
    threshold: number;
  }>().notNull(),
});

// User badges junction table
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

// Daily progress tracking
export const dailyProgress = pgTable("daily_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  caloriesLogged: boolean("calories_logged").default(false),
  waterLogged: boolean("water_logged").default(false),
  exerciseLogged: boolean("exercise_logged").default(false),
  weightLogged: boolean("weight_logged").default(false),
  completedTasks: integer("completed_tasks").default(0),
  totalTasks: integer("total_tasks").default(0),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'badge', 'reminder', 'milestone'
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  scheduledFor: timestamp("scheduled_for"),
  data: jsonb("data"),
});


// Add ProgressPhoto type to schema.ts
export const progressPhotos = pgTable("progress_photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  type: text("type").notNull(), // 'latest' | 'favorite' | 'first'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User dietary preferences schema
export const userDietaryPreferences = pgTable("user_dietary_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  allergies: jsonb("allergies").$type<string[]>().default([]),
  dietaryType: text("dietary_type").notNull(), // vegetarian, vegan, keto, etc.
  calorieTarget: integer("calorie_target").notNull(),
  mealsPerDay: integer("meals_per_day").notNull(),
  preferredIngredients: jsonb("preferred_ingredients").$type<string[]>().default([]),
  excludedIngredients: jsonb("excluded_ingredients").$type<string[]>().default([]),
  maxCookingTime: integer("max_cooking_time"), // in minutes
  budgetPreference: text("budget_preference"), // low, medium, high
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Meal plans schema
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  totalCalories: integer("total_calories").notNull(),
  status: text("status").notNull().default('active'), // active, completed, archived
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Junction table for recipes in meal plans
export const recipesInMealPlan = pgTable("recipes_in_meal_plan", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").notNull().references(() => mealPlans.id),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  servingSize: decimal("serving_size", { precision: 5, scale: 2 }).notNull().default("1.00"),
  order: integer("order").notNull().default(0),
  isFrozen: boolean("is_frozen").default(true),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow()
});

// Shopping list items schema
export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  isChecked: boolean("is_checked").default(false),
  customImage: text("custom_image"),
  category: text("category").default("other"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  meal_plan_id: integer("meal_plan_id").references(() => mealPlans.id),
  unit: text("unit"),
  ingredient: text("ingredient"),
  isPurchased: boolean("is_purchased").default(false),
  meal_type: text("meal_type"),
  recipe_name: text("recipe_name"),
  recipe_image: text("recipe_image"),
});

// Password reset tokens schema
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});

// Password reset tokens relations
export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  foodLogs: many(foodLogs),
  recipes: many(recipes),
  recipeLikes: many(recipeLikes),
  recipeComments: many(recipeComments),
  badges: many(userBadges),
  dailyProgress: many(dailyProgress),
  notifications: many(notifications),
  progressPhotos: many(progressPhotos),
  nutritionPreferences: many(userNutritionPreferences),
  passwordResetTokens: many(passwordResetTokens)
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  likes: many(recipeLikes),
  comments: many(recipeComments),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userDietaryPreferencesRelations = relations(userDietaryPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userDietaryPreferences.userId],
    references: [users.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [mealPlans.userId],
    references: [users.id],
  }),
  recipes: many(recipesInMealPlan),
  shoppingList: many(shoppingListItems),
}));


// Types and validation schemas
export type SelectUser = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeLike = typeof recipeLikes.$inferSelect;
export type RecipeComment = typeof recipeComments.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type UserNutritionPreferences = typeof userNutritionPreferences.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type DailyProgress = typeof dailyProgress.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertProgressPhoto = typeof progressPhotos.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type InsertDailyProgress = z.infer<typeof insertDailyProgressSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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

export const insertBadgeSchema = z.object({
  name: z.string().min(1, "Badge name is required"),
  description: z.string().min(1, "Badge description is required"),
  icon: z.string().min(1, "Badge icon is required"),
  requirement: z.object({
    type: z.enum(['weight_goal', 'meal_variety']),
    threshold: z.number().positive(),
  }),
});

export const insertDailyProgressSchema = z.object({
  date: z.date(),
  caloriesLogged: z.boolean().optional(),
  waterLogged: z.boolean().optional(),
  exerciseLogged: z.boolean().optional(),
  weightLogged: z.boolean().optional(),
  completedTasks: z.number().min(0).optional(),
  totalTasks: z.number().min(0).optional(),
});

export const insertNotificationSchema = z.object({
  type: z.enum(['badge', 'reminder', 'milestone']),
  title: z.string().min(1, "Notification title is required"),
  message: z.string().min(1, "Notification message is required"),
  scheduledFor: z.date().optional(),
  data: z.record(z.unknown()).optional(),
});

// Add validation schemas for new tables
export const insertUserDietaryPreferencesSchema = createInsertSchema(userDietaryPreferences);
export const insertMealPlanSchema = createInsertSchema(mealPlans);
export const insertRecipeInMealPlanSchema = createInsertSchema(recipesInMealPlan);
export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems);

// Add types for new tables
export type UserDietaryPreferences = typeof userDietaryPreferences.$inferSelect;
export type InsertUserDietaryPreferences = typeof userDietaryPreferences.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = typeof mealPlans.$inferInsert;
export type RecipeInMealPlan = typeof recipesInMealPlan.$inferSelect;
export type InsertRecipeInMealPlan = typeof recipesInMealPlan.$inferInsert;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = typeof shoppingListItems.$inferInsert;