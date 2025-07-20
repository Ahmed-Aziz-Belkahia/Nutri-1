-- Add meal information fields to shopping list items
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS meal_type TEXT,
ADD COLUMN IF NOT EXISTS recipe_name TEXT,
ADD COLUMN IF NOT EXISTS recipe_image TEXT;