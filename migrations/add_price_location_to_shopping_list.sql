-- Add price and location columns to shopping_list_items table
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS location TEXT;