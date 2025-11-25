-- Create all tables with correct schema
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS `users` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `username` text NOT NULL,
        `email` text NOT NULL,
        `password` text NOT NULL,
        `has_completed_onboarding` integer DEFAULT false,
        `last_activity_date` text,
        `profile_image` text,
        `preferred_language` text DEFAULT 'en',
        `reset_token` text,
        `reset_token_expires_at` integer,
        `is_email_verified` integer DEFAULT false,
        `verification_code` text,
        `verification_code_expires_at` integer,
        `current_streak` integer,
        `longest_streak` integer,
        `experience_points` integer,
        `level` integer,
        `is_admin` integer DEFAULT false,
        `google_id` text,
        `google_email` text,
        `google_picture` text,
        `auth_provider` text DEFAULT 'local',
        `email_verified_via` text,
        `last_login_at` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

CREATE TABLE IF NOT EXISTS `user_dietary_preferences` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `allergies` text,
        `dietary_type` text NOT NULL,
        `calorie_target` integer NOT NULL,
        `meals_per_day` integer NOT NULL,
        `preferred_ingredients` text,
        `excluded_ingredients` text,
        `max_cooking_time` integer,
        `budget_preference` text,
        `health_goals` text,
        `cuisine_preferences` text,
        `cooking_skill_level` text,
        `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `user_nutrition_preferences` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `age` integer,
        `gender` text,
        `current_weight` real NOT NULL,
        `goal_weight` real NOT NULL,
        `height` real NOT NULL,
        `weight_goal` text NOT NULL,
        `activity_level` text NOT NULL,
        `daily_calorie_goal` integer NOT NULL,
        `protein_goal_percentage` integer NOT NULL,
        `carbs_goal_percentage` integer NOT NULL,
        `fat_goal_percentage` integer NOT NULL,
        `body_fat_percentage` real,
        `body_type` text,
        `dietary_restrictions` text,
        `allergies` text,
        `meal_budget` text,
        `experience_level` text,
        `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `token` text NOT NULL,
        `expires_at` integer NOT NULL,
        `is_revoked` integer DEFAULT false NOT NULL,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);

CREATE TABLE IF NOT EXISTS `recipes` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `name` text NOT NULL,
        `description` text,
        `ingredients` text NOT NULL,
        `instructions` text NOT NULL,
        `nutrition_info` text,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `image_url` text,
        `rating` real DEFAULT 0,
        `likes_count` integer DEFAULT 0,
        `comments_count` integer DEFAULT 0,
        `is_public` integer DEFAULT false,
        `is_saved` integer DEFAULT false,
        `source` text DEFAULT 'created',
        `original_recipe_id` integer,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `food_logs` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `name` text NOT NULL,
        `calories` real NOT NULL,
        `protein` real NOT NULL,
        `carbs` real NOT NULL,
        `fat` real NOT NULL,
        `date` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
        `image` text,
        `components` text,
        `description` text,
        `ingredients` text,
        `instructions` text,
        `prep_time` integer,
        `cook_time` integer,
        `servings` integer DEFAULT 1,
        `image_url` text,
        `source` text DEFAULT 'scanned',
        `is_recipe` integer DEFAULT false,
        `recipe_id` integer,
        `cuisine_type` text,
        `meal_type` text,
        `difficulty` text,
        `tags` text,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `meal_plans` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `date` text NOT NULL,
        `total_calories` integer NOT NULL,
        `status` text DEFAULT 'active' NOT NULL,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `recipes_in_meal_plan` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `meal_plan_id` integer NOT NULL,
        `recipe_id` integer NOT NULL,
        `meal_type` text NOT NULL,
        `serving_size` real DEFAULT 1 NOT NULL,
        `order` integer DEFAULT 0 NOT NULL,
        `is_frozen` integer DEFAULT true,
        `is_completed` integer DEFAULT false,
        `completed_at` integer,
        `created_at` integer DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (`meal_plan_id`) REFERENCES `meal_plans`(`id`) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `weight_logs` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `weight` real NOT NULL,
        `notes` text,
        `logged_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `progress_photos` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `photo_url` text NOT NULL,
        `caption` text,
        `type` text NOT NULL,
        `photo_date` text DEFAULT (date('now')) NOT NULL,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `shopping_list_items` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `name` text NOT NULL,
        `quantity` text NOT NULL,
        `is_checked` integer DEFAULT false,
        `custom_image` text,
        `category` text DEFAULT 'other',
        `created_at` integer DEFAULT (strftime('%s', 'now')),
        `updated_at` integer DEFAULT (strftime('%s', 'now')),
        `meal_plan_id` integer,
        `unit` text,
        `ingredient` text,
        `is_purchased` integer DEFAULT false,
        `meal_type` text,
        `recipe_name` text,
        `recipe_image` text,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (`meal_plan_id`) REFERENCES `meal_plans`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `badges` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `name` text NOT NULL,
        `description` text NOT NULL,
        `icon` text NOT NULL,
        `requirement` text NOT NULL
);

CREATE TABLE IF NOT EXISTS `user_badges` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `badge_id` integer NOT NULL,
        `earned_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (`badge_id`) REFERENCES `badges`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `daily_progress` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `date` text NOT NULL,
        `calories_logged` integer DEFAULT false,
        `water_logged` integer DEFAULT false,
        `exercise_logged` integer DEFAULT false,
        `weight_logged` integer DEFAULT false,
        `completed_tasks` integer DEFAULT 0,
        `total_tasks` integer DEFAULT 0,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `notifications` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `type` text NOT NULL,
        `title` text NOT NULL,
        `message` text NOT NULL,
        `is_read` integer DEFAULT false,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `scheduled_for` integer,
        `data` text,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `recipe_likes` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `recipe_id` integer NOT NULL,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `recipe_comments` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `recipe_id` integer NOT NULL,
        `content` text NOT NULL,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `token` text NOT NULL,
        `expires_at` integer NOT NULL,
        `created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `used_at` integer,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS `pending_registrations` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `email` text NOT NULL,
        `password` text NOT NULL,
        `verification_code` text NOT NULL,
        `verification_code_expires_at` integer NOT NULL,
        `profile_data` text,
        `created_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `pending_registrations_email_unique` ON `pending_registrations` (`email`);

CREATE TABLE IF NOT EXISTS `user_token_limits` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `tier` text DEFAULT 'free' NOT NULL,
        `daily_token_limit` integer DEFAULT 10000 NOT NULL,
        `monthly_token_limit` integer DEFAULT 200000 NOT NULL,
        `daily_used` integer DEFAULT 0 NOT NULL,
        `monthly_used` integer DEFAULT 0 NOT NULL,
        `last_reset_daily` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `last_reset_monthly` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `user_token_limits_user_id_unique` ON `user_token_limits` (`user_id`);

CREATE TABLE IF NOT EXISTS `api_usage_tracking` (
        `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        `user_id` integer NOT NULL,
        `endpoint` text NOT NULL,
        `tokens_used` integer DEFAULT 0 NOT NULL,
        `cost_usd` real DEFAULT 0 NOT NULL,
        `request_date` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        `model` text,
        `status` text DEFAULT 'success' NOT NULL,
        `metadata` text,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

PRAGMA foreign_keys = ON;
