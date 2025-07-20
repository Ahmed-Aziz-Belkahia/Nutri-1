-- Add custom_image column to shopping_list_items table
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS custom_image TEXT;