import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';

// User schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  hasCompletedOnboarding: integer("has_completed_onboarding", { mode: 'boolean' }).default(false),
  lastActivityDate: text("last_activity_date"),
  profileImage: text("profile_image"),
  preferred_language: text("preferred_language").default("en"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: integer("reset_token_expires_at", { mode: 'timestamp' }),
  currentStreak: integer("current_streak"),
  longestStreak: integer("longest_streak"),
  experiencePoints: integer("experience_points"),
  level: integer("level"),
  isAdmin: integer("is_admin", { mode: 'boolean' }).default(false),
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

// Food logs schema
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
});

export const insertFoodLogSchema = createInsertSchema(foodLogs);
export const selectFoodLogSchema = createSelectSchema(foodLogs);
export type InsertFoodLog = typeof foodLogs.$inferInsert;
export type SelectFoodLog = typeof foodLogs.$inferSelect;

// User nutrition preferences schema
export const userNutritionPreferences = sqliteTable("user_nutrition_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
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
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const insertUserNutritionPreferencesSchema = createInsertSchema(userNutritionPreferences);
export const selectUserNutritionPreferencesSchema = createSelectSchema(userNutritionPreferences);
export type InsertUserNutritionPreferences = typeof userNutritionPreferences.$inferInsert;
export type SelectUserNutritionPreferences = typeof userNutritionPreferences.$inferSelect;

// Weight logs schema
export const weightLogs = sqliteTable("weight_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  weight: real("weight").notNull(),
  notes: text("notes"),
  loggedAt: integer("logged_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const insertWeightLogSchema = createInsertSchema(weightLogs);
export const selectWeightLogSchema = createSelectSchema(weightLogs);
export type InsertWeightLog = typeof weightLogs.$inferInsert;
export type SelectWeightLog = typeof weightLogs.$inferSelect;

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

// Recipe likes schema
export const recipeLikes = sqliteTable("recipe_likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Recipe comments schema
export const recipeComments = sqliteTable("recipe_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Progress photos schema
export const progressPhotos = sqliteTable("progress_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  type: text("type").notNull(),
  photoDate: text("photo_date").notNull().default(sql`(date('now'))`), // YYYY-MM-DD format
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// User dietary preferences schema
export const userDietaryPreferences = sqliteTable("user_dietary_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  allergies: text("allergies", { mode: 'json' }).$type<string[]>(),
  dietaryType: text("dietary_type").notNull(),
  calorieTarget: integer("calorie_target").notNull(),
  mealsPerDay: integer("meals_per_day").notNull(),
  preferredIngredients: text("preferred_ingredients", { mode: 'json' }).$type<string[]>(),
  excludedIngredients: text("excluded_ingredients", { mode: 'json' }).$type<string[]>(),
  maxCookingTime: integer("max_cooking_time"),
  budgetPreference: text("budget_preference"),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Meal plans schema
export const mealPlans = sqliteTable("meal_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  totalCalories: integer("total_calories").notNull(),
  status: text("status").notNull().default('active'),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Junction table for recipes in meal plans
export const recipesInMealPlan = sqliteTable("recipes_in_meal_plan", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mealPlanId: integer("meal_plan_id").notNull().references(() => mealPlans.id),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id),
  mealType: text("meal_type").notNull(),
  servingSize: real("serving_size").notNull().default(1.0),
  order: integer("order").notNull().default(0),
  isFrozen: integer("is_frozen", { mode: 'boolean' }).default(true),
  isCompleted: integer("is_completed", { mode: 'boolean' }).default(false),
  completedAt: integer("completed_at", { mode: 'timestamp' }),
  created_at: integer("created_at", { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

// Shopping list items schema
export const shoppingListItems = sqliteTable("shopping_list_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  isChecked: integer("is_checked", { mode: 'boolean' }).default(false),
  customImage: text("custom_image"),
  category: text("category").default("other"),
  created_at: integer("created_at", { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  updated_at: integer("updated_at", { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  meal_plan_id: integer("meal_plan_id").references(() => mealPlans.id),
  unit: text("unit"),
  ingredient: text("ingredient"),
  isPurchased: integer("is_purchased", { mode: 'boolean' }).default(false),
  meal_type: text("meal_type"),
  recipe_name: text("recipe_name"),
  recipe_image: text("recipe_image"),
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
  recipeLikes: many(recipeLikes),
  recipeComments: many(recipeComments),
  progressPhotos: many(progressPhotos),
  nutritionPreferences: many(userNutritionPreferences),
  passwordResetTokens: many(passwordResetTokens)
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  likes: many(recipeLikes),
  comments: many(recipeComments),
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

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Types and validation schemas
export type SelectUser = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type RecipeLike = typeof recipeLikes.$inferSelect;
export type RecipeComment = typeof recipeComments.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type UserNutritionPreferences = typeof userNutritionPreferences.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertProgressPhoto = typeof progressPhotos.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserDietaryPreferences = typeof userDietaryPreferences.$inferSelect;
export type InsertUserDietaryPreferences = typeof userDietaryPreferences.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = typeof mealPlans.$inferInsert;
export type RecipeInMealPlan = typeof recipesInMealPlan.$inferSelect;
export type InsertRecipeInMealPlan = typeof recipesInMealPlan.$inferInsert;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = typeof shoppingListItems.$inferInsert;

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

export const insertUserDietaryPreferencesSchema = createInsertSchema(userDietaryPreferences);
export const insertMealPlanSchema = createInsertSchema(mealPlans);
export const insertRecipeInMealPlanSchema = createInsertSchema(recipesInMealPlan);
export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems);

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
