import Database from 'better-sqlite3';

const db = new Database('sqlite.db');

console.log('🔍 Checking current database schema...');

// Check if user_dietary_preferences table exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(user_dietary_preferences)").all();
  console.log('Current user_dietary_preferences columns:', tableInfo.map(c => c.name));
  
  const hasDietaryType = tableInfo.some(c => c.name === 'dietary_type');
  const hasDietaryRestrictions = tableInfo.some(c => c.name === 'dietary_restrictions');
  
  if (!hasDietaryType && hasDietaryRestrictions) {
    console.log('📝 Need to migrate: dietary_restrictions → dietary_type');
    
    // Rename column
    db.exec(`
      ALTER TABLE user_dietary_preferences RENAME COLUMN dietary_restrictions TO dietary_type;
    `);
    console.log('✅ Renamed dietary_restrictions to dietary_type');
  } else if (hasDietaryType) {
    console.log('✅ dietary_type column already exists');
  }
  
  // Check for other missing columns
  const hasCalorieTarget = tableInfo.some(c => c.name === 'calorie_target');
  const hasMealsPerDay = tableInfo.some(c => c.name === 'meals_per_day');
  const hasPreferredIngredients = tableInfo.some(c => c.name === 'preferred_ingredients');
  const hasExcludedIngredients = tableInfo.some(c => c.name === 'excluded_ingredients');
  const hasDislikedIngredients = tableInfo.some(c => c.name === 'disliked_ingredients');
  
  // Add missing columns
  if (!hasCalorieTarget) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN calorie_target integer NOT NULL DEFAULT 2000;`);
    console.log('✅ Added calorie_target column');
  }
  
  if (!hasMealsPerDay) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN meals_per_day integer NOT NULL DEFAULT 3;`);
    console.log('✅ Added meals_per_day column');
  }
  
  if (!hasPreferredIngredients) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN preferred_ingredients text;`);
    console.log('✅ Added preferred_ingredients column');
  }
  
  if (!hasExcludedIngredients && hasDislikedIngredients) {
    db.exec(`ALTER TABLE user_dietary_preferences RENAME COLUMN disliked_ingredients TO excluded_ingredients;`);
    console.log('✅ Renamed disliked_ingredients to excluded_ingredients');
  } else if (!hasExcludedIngredients) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN excluded_ingredients text;`);
    console.log('✅ Added excluded_ingredients column');
  }
  
  const hasMaxCookingTime = tableInfo.some(c => c.name === 'max_cooking_time');
  const hasBudgetPreference = tableInfo.some(c => c.name === 'budget_preference');
  const hasHealthGoals = tableInfo.some(c => c.name === 'health_goals');
  const hasCuisinePreferences = tableInfo.some(c => c.name === 'cuisine_preferences');
  const hasCookingSkillLevel = tableInfo.some(c => c.name === 'cooking_skill_level');
  
  if (!hasMaxCookingTime) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN max_cooking_time integer;`);
    console.log('✅ Added max_cooking_time column');
  }
  
  if (!hasBudgetPreference) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN budget_preference text;`);
    console.log('✅ Added budget_preference column');
  }
  
  if (!hasHealthGoals) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN health_goals text;`);
    console.log('✅ Added health_goals column');
  }
  
  if (!hasCuisinePreferences) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN cuisine_preferences text;`);
    console.log('✅ Added cuisine_preferences column');
  }
  
  if (!hasCookingSkillLevel) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN cooking_skill_level text;`);
    console.log('✅ Added cooking_skill_level column');
  }
  
  const hasUpdatedAt = tableInfo.some(c => c.name === 'updated_at');
  if (!hasUpdatedAt) {
    db.exec(`ALTER TABLE user_dietary_preferences ADD COLUMN updated_at integer DEFAULT (strftime('%s', 'now')) NOT NULL;`);
    console.log('✅ Added updated_at column');
  }
  
} catch (err) {
  if (err.message.includes('no such table')) {
    console.log('⚠️  Table user_dietary_preferences does not exist, creating it...');
    db.exec(`
      CREATE TABLE user_dietary_preferences (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id integer NOT NULL,
        allergies text,
        dietary_type text NOT NULL,
        calorie_target integer NOT NULL,
        meals_per_day integer NOT NULL,
        preferred_ingredients text,
        excluded_ingredients text,
        max_cooking_time integer,
        budget_preference text,
        health_goals text,
        cuisine_preferences text,
        cooking_skill_level text,
        updated_at integer DEFAULT (strftime('%s', 'now')) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      );
    `);
    console.log('✅ Created user_dietary_preferences table');
  } else {
    throw err;
  }
}

// Verify final schema
console.log('\n📊 Final schema verification:');
const finalTableInfo = db.prepare("PRAGMA table_info(user_dietary_preferences)").all();
console.log('Columns:', finalTableInfo.map(c => c.name).join(', '));

console.log('\n✅ Migration completed successfully!');
db.close();
