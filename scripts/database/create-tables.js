import pg from 'pg';
import fs from 'fs/promises';

const { Pool } = pg;

// Get connection from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTables() {
  try {
    console.log('Creating database tables...');
    
    // Create users table first as other tables reference it
    await pool.query(`
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
        "current_streak" integer,
        "longest_streak" integer,
        "experience_points" integer,
        "level" integer
      );
    `);
    console.log('Created users table');

    // Create badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "badges" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "icon" text NOT NULL,
        "requirement" jsonb NOT NULL
      );
    `);
    console.log('Created badges table');

    // Create user_badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_badges" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "badge_id" integer NOT NULL REFERENCES "badges"("id"),
        "earned_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created user_badges table');

    // Create food_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "food_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "name" text NOT NULL,
        "calories" numeric(10, 2) NOT NULL,
        "protein" numeric(10, 2) NOT NULL,
        "carbs" numeric(10, 2) NOT NULL,
        "fat" numeric(10, 2) NOT NULL,
        "date" timestamp DEFAULT now() NOT NULL,
        "image" text,
        "components" jsonb
      );
    `);
    console.log('Created food_logs table');

    // Create recipes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "recipes" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "name" text NOT NULL,
        "description" text,
        "ingredients" jsonb NOT NULL,
        "instructions" jsonb NOT NULL,
        "nutrition_info" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "image_url" text,
        "rating" decimal DEFAULT '0',
        "likes_count" integer DEFAULT 0,
        "comments_count" integer DEFAULT 0,
        "is_public" boolean DEFAULT false,
        "is_saved" boolean DEFAULT false,
        "source" text DEFAULT 'created',
        "original_recipe_id" integer
      );
    `);
    console.log('Created recipes table');

    // Create recipe_likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "recipe_likes" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "recipe_id" integer NOT NULL REFERENCES "recipes"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created recipe_likes table');

    // Create recipe_comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "recipe_comments" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "recipe_id" integer NOT NULL REFERENCES "recipes"("id"),
        "content" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created recipe_comments table');

    // Create weight_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "weight_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "weight" numeric(5, 2) NOT NULL,
        "date" timestamp DEFAULT now() NOT NULL,
        "notes" text
      );
    `);
    console.log('Created weight_logs table');

    // Create user_nutrition_preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_nutrition_preferences" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "calories_goal" integer NOT NULL,
        "protein_goal" integer NOT NULL,
        "carbs_goal" integer NOT NULL,
        "fat_goal" integer NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created user_nutrition_preferences table');

    // Create progress_photos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "progress_photos" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "photo_url" text NOT NULL,
        "caption" text,
        "type" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created progress_photos table');

    // Create meal_plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "meal_plans" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "date" date NOT NULL,
        "total_calories" integer NOT NULL,
        "status" text DEFAULT 'active' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created meal_plans table');

    // Create recipes_in_meal_plan table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "recipes_in_meal_plan" (
        "id" serial PRIMARY KEY NOT NULL,
        "meal_plan_id" integer NOT NULL REFERENCES "meal_plans"("id"),
        "recipe_id" integer NOT NULL REFERENCES "recipes"("id"),
        "meal_type" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created recipes_in_meal_plan table');

    // Create shopping_list_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "shopping_list_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "name" text NOT NULL,
        "quantity" text,
        "is_checked" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created shopping_list_items table');

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "type" text NOT NULL,
        "title" text NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "scheduled_for" timestamp,
        "data" jsonb
      );
    `);
    console.log('Created notifications table');

    // Create password_reset_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "token" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "used_at" timestamp
      );
    `);
    console.log('Created password_reset_tokens table');

    // Create daily_progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "daily_progress" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "date" date NOT NULL,
        "calories_logged" boolean DEFAULT false,
        "water_logged" boolean DEFAULT false,
        "exercise_logged" boolean DEFAULT false,
        "weight_logged" boolean DEFAULT false,
        "completed_tasks" integer DEFAULT 0,
        "total_tasks" integer DEFAULT 0
      );
    `);
    console.log('Created daily_progress table');

    // Create user_dietary_preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user_dietary_preferences" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id"),
        "allergies" jsonb DEFAULT '[]',
        "dietary_type" text NOT NULL,
        "calorie_target" integer NOT NULL,
        "meals_per_day" integer NOT NULL,
        "preferred_ingredients" jsonb DEFAULT '[]',
        "excluded_ingredients" jsonb DEFAULT '[]',
        "max_cooking_time" integer,
        "budget_preference" text,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created user_dietary_preferences table');

    console.log('All tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

// Run the function
createTables()
  .then(() => {
    console.log('Database setup completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });