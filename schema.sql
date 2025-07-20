-- NutriAI Database Schema
-- This file contains SQL commands to create all tables and relationships

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "password" text NOT NULL,
  "has_completed_onboarding" boolean DEFAULT false,
  "last_activity_date" date,
  "profile_image" text,
  "preferred_language" text DEFAULT 'en',
  "reset_token" text,
  "reset_token_expires_at" timestamp,
  "current_streak" integer DEFAULT 0,
  "longest_streak" integer DEFAULT 0,
  "experience_points" integer DEFAULT 0,
  "level" integer DEFAULT 1
);

-- Badges/achievements
CREATE TABLE IF NOT EXISTS "badges" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "icon" text NOT NULL,
  "requirement" jsonb NOT NULL
);

-- User badges junction table
CREATE TABLE IF NOT EXISTS "user_badges" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "badge_id" integer NOT NULL REFERENCES badges(id),
  "earned_at" timestamp NOT NULL DEFAULT now()
);

-- Recipes
CREATE TABLE IF NOT EXISTS "recipes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "name" text NOT NULL,
  "description" text,
  "ingredients" jsonb NOT NULL,
  "instructions" jsonb NOT NULL,
  "nutrition_info" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "image_url" text,
  "rating" decimal DEFAULT '0',
  "likes_count" integer DEFAULT 0,
  "comments_count" integer DEFAULT 0,
  "is_public" boolean DEFAULT false,
  "is_saved" boolean DEFAULT false,
  "source" text DEFAULT 'created',
  "original_recipe_id" integer,
  "is_liked" boolean DEFAULT false
);

-- Recipe likes
CREATE TABLE IF NOT EXISTS "recipe_likes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "recipe_id" integer NOT NULL REFERENCES recipes(id),
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Recipe comments
CREATE TABLE IF NOT EXISTS "recipe_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "recipe_id" integer NOT NULL REFERENCES recipes(id),
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Food logs
CREATE TABLE IF NOT EXISTS "food_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "name" text NOT NULL,
  "calories" numeric(10, 2) NOT NULL,
  "protein" numeric(10, 2) NOT NULL,
  "carbs" numeric(10, 2) NOT NULL,
  "fat" numeric(10, 2) NOT NULL,
  "date" timestamp DEFAULT now() NOT NULL,
  "image" text,
  "components" jsonb
);

-- User nutrition preferences
CREATE TABLE IF NOT EXISTS "user_nutrition_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "daily_calorie_goal" integer NOT NULL,
  "protein_goal_percentage" integer,
  "carbs_goal_percentage" integer,
  "fat_goal_percentage" integer,
  "height" integer,
  "weight" numeric(5, 2),
  "current_weight" numeric(5, 2),
  "goal_weight" numeric(5, 2),
  "weight_goal" text,
  "activity_level" text,
  "meal_budget" text,
  "experience_level" text,
  "dietary_restrictions" jsonb DEFAULT '[]',
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Weight logs
CREATE TABLE IF NOT EXISTS "weight_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "weight" numeric(5, 2) NOT NULL,
  "date" timestamp NOT NULL DEFAULT now(),
  "logged_at" timestamp NOT NULL DEFAULT now(),
  "notes" text
);

-- User dietary preferences
CREATE TABLE IF NOT EXISTS "user_dietary_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "allergies" jsonb DEFAULT '[]',
  "dietary_type" text NOT NULL,
  "calorie_target" integer NOT NULL,
  "meals_per_day" integer NOT NULL,
  "preferred_ingredients" jsonb DEFAULT '[]',
  "excluded_ingredients" jsonb DEFAULT '[]',
  "max_cooking_time" integer,
  "budget_preference" text,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Meal plans
CREATE TABLE IF NOT EXISTS "meal_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "date" date NOT NULL,
  "total_calories" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Recipes in meal plans
CREATE TABLE IF NOT EXISTS "recipes_in_meal_plan" (
  "id" serial PRIMARY KEY NOT NULL,
  "meal_plan_id" integer NOT NULL REFERENCES meal_plans(id),
  "recipe_id" integer NOT NULL REFERENCES recipes(id),
  "meal_type" text NOT NULL,
  "serving_size" decimal(5, 2) NOT NULL DEFAULT '1.00',
  "order" integer NOT NULL DEFAULT 0,
  "is_frozen" boolean DEFAULT true,
  "is_completed" boolean DEFAULT false,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- Shopping list items
CREATE TABLE IF NOT EXISTS "shopping_list_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "name" text NOT NULL,
  "quantity" text NOT NULL,
  "is_checked" boolean DEFAULT false,
  "custom_image" text,
  "category" text DEFAULT 'other',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "meal_plan_id" integer REFERENCES meal_plans(id),
  "unit" text,
  "ingredient" text,
  "is_purchased" boolean DEFAULT false,
  "meal_type" text,
  "recipe_name" text,
  "recipe_image" text
);

-- Daily progress tracking
CREATE TABLE IF NOT EXISTS "daily_progress" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "date" date NOT NULL,
  "calories_logged" boolean DEFAULT false,
  "water_logged" boolean DEFAULT false,
  "exercise_logged" boolean DEFAULT false,
  "weight_logged" boolean DEFAULT false,
  "completed_tasks" integer DEFAULT 0,
  "total_tasks" integer DEFAULT 0
);

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "scheduled_for" timestamp,
  "data" jsonb
);

-- Progress photos
CREATE TABLE IF NOT EXISTS "progress_photos" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "photo_url" text NOT NULL,
  "caption" text,
  "type" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "used_at" timestamp
);