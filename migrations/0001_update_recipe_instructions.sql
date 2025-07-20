-- Custom migration to update the existing recipe instructions from TEXT to JSONB array
-- For existing recipes, we'll try to parse the instructions as JSON if possible,
-- otherwise, we'll convert the string into a single-element array

-- First, make a backup of the current instructions
ALTER TABLE recipes ADD COLUMN instructions_backup text;
UPDATE recipes SET instructions_backup = instructions::text;

-- Update the instructions to be a JSON array for recipes where the instructions are empty or '{}'
UPDATE recipes SET instructions = '[]'::jsonb WHERE instructions = '{}' OR instructions::text = '' OR instructions IS NULL;

-- For recipes that have instructions in text format, try to convert them to arrays
-- This handles cases where the instructions might be a string
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, instructions::text as inst FROM recipes WHERE instructions::text NOT LIKE '[%]'
  LOOP
    BEGIN
      -- Split the string on newlines if it's not already an array
      IF r.inst != '[]' AND r.inst != '{}' THEN
        UPDATE recipes 
        SET instructions = (
          SELECT json_agg(s) 
          FROM (
            SELECT unnest(string_to_array(TRIM(BOTH '"' FROM r.inst), E'\n')) as s
            WHERE unnest IS NOT NULL AND LENGTH(unnest) > 0
          ) as subq
        )::jsonb
        WHERE id = r.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, wrap the entire string in an array
      UPDATE recipes SET instructions = json_build_array(r.inst)::jsonb WHERE id = r.id;
    END;
  END LOOP;
END $$;

-- Make sure no recipes have NULL instructions
UPDATE recipes SET instructions = '[]'::jsonb WHERE instructions IS NULL;