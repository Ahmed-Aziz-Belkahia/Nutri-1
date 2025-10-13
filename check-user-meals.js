import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');

console.log('🔍 Checking meals for user ID 1...');
console.log('Database path:', dbPath);
console.log('');

try {
  const db = new Database(dbPath);

  // Get total count of meals for user 1
  const countResult = db.prepare(`
    SELECT COUNT(*) as total_meals 
    FROM food_logs 
    WHERE user_id = 1
  `).get();

  console.log(`📊 Total meals scanned by user 1: ${countResult.total_meals}`);
  console.log('');

  // Get detailed list of meals
  const meals = db.prepare(`
    SELECT 
      id,
      name,
      calories,
      protein,
      carbs,
      fat,
      date,
      datetime(date, 'unixepoch', 'localtime') as formatted_date,
      image
    FROM food_logs 
    WHERE user_id = 1
    ORDER BY date DESC
  `).all();

  if (meals.length > 0) {
    console.log('📋 Detailed meal list:');
    console.log('='.repeat(80));
    
    meals.forEach((meal, index) => {
      console.log(`\n${index + 1}. ${meal.name}`);
      console.log(`   ID: ${meal.id}`);
      console.log(`   Date: ${meal.formatted_date}`);
      console.log(`   Calories: ${meal.calories} kcal`);
      console.log(`   Protein: ${meal.protein}g | Carbs: ${meal.carbs}g | Fat: ${meal.fat}g`);
      console.log(`   Has Image: ${meal.image ? '✅ Yes' : '❌ No'}`);
    });

    console.log('\n' + '='.repeat(80));
    
    // Summary statistics
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
    const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);

    console.log('\n📈 Summary Statistics:');
    console.log(`   Total Meals: ${meals.length}`);
    console.log(`   Total Calories: ${totalCalories.toFixed(1)} kcal`);
    console.log(`   Total Protein: ${totalProtein.toFixed(1)}g`);
    console.log(`   Total Carbs: ${totalCarbs.toFixed(1)}g`);
    console.log(`   Total Fat: ${totalFat.toFixed(1)}g`);
    console.log(`   Avg Calories/Meal: ${(totalCalories / meals.length).toFixed(1)} kcal`);
    
  } else {
    console.log('❌ No meals found for user 1');
  }

  db.close();
  console.log('\n✅ Query completed successfully!');

} catch (error) {
  console.error('❌ Query failed:', error);
  process.exit(1);
}
