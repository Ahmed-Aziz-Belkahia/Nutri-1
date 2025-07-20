-- Create meal_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS "meal_plans" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "date" DATE NOT NULL,
  "total_calories" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create recipes_in_meal_plan table if it doesn't exist
CREATE TABLE IF NOT EXISTS "recipes_in_meal_plan" (
  "id" SERIAL PRIMARY KEY,
  "meal_plan_id" INTEGER NOT NULL REFERENCES "meal_plans"("id"),
  "recipe_id" INTEGER NOT NULL REFERENCES "recipes"("id"),
  "meal_type" TEXT NOT NULL,
  "serving_size" DECIMAL(5,2) NOT NULL,
  "order" INTEGER NOT NULL,
  "is_frozen" BOOLEAN DEFAULT TRUE,
  "is_completed" BOOLEAN DEFAULT FALSE,
  "completed_at" TIMESTAMP
);

-- Create shopping_list_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS "shopping_list_items" (
  "id" SERIAL PRIMARY KEY,
  "meal_plan_id" INTEGER NOT NULL REFERENCES "meal_plans"("id"),
  "ingredient" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL,
  "unit" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "is_purchased" BOOLEAN DEFAULT FALSE
);