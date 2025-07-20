-- Add bodyFatPercentage and bodyType columns to user_nutrition_preferences table
ALTER TABLE user_nutrition_preferences 
ADD COLUMN body_fat_percentage DECIMAL(5, 2),
ADD COLUMN body_type TEXT;