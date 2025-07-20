// Test script to verify shopping list generation functionality

const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Create a connection pool to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testShoppingListGeneration() {
  console.log('Testing shopping list generation functionality...');
  
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to the database successfully.');
    
    // Get a recent meal plan to test with
    const mealPlanResult = await client.query(`
      SELECT id, date 
      FROM meal_plans 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (mealPlanResult.rows.length === 0) {
      console.log('No meal plans found to test with.');
      client.release();
      return;
    }
    
    const mealPlan = mealPlanResult.rows[0];
    console.log(`Found meal plan ${mealPlan.id} from date ${mealPlan.date} to test with.`);
    
    // Get shopping list items for this meal plan
    const shoppingListResult = await client.query(`
      SELECT * 
      FROM shopping_list_items 
      WHERE meal_plan_id = $1
      ORDER BY category, name
    `, [mealPlan.id]);
    
    console.log(`Found ${shoppingListResult.rows.length} shopping list items for meal plan ${mealPlan.id}.`);
    
    // Group items by category
    const groupedItems = {};
    for (const item of shoppingListResult.rows) {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item);
    }
    
    // Print out grouped items
    console.log('\nShopping List by Category:');
    for (const [category, items] of Object.entries(groupedItems)) {
      console.log(`\n${category.toUpperCase()} (${items.length} items):`);
      
      for (const item of items) {
        const name = item.name || item.ingredient || 'Unnamed item';
        const quantity = item.quantity || 'n/a';
        const mealType = item.meal_type || 'n/a';
        const recipeName = item.recipe_name || 'n/a';
        
        console.log(`  • ${name} (${quantity}) - For: ${mealType} - Recipe: ${recipeName}`);
      }
    }
    
    // Get recipe information for this meal plan to verify ingredients are correctly tracked
    const recipesResult = await client.query(`
      SELECT r.id, r.name, r.ingredients, rmp.meal_type
      FROM recipes_in_meal_plan rmp
      JOIN recipes r ON r.id = rmp.recipe_id
      WHERE rmp.meal_plan_id = $1
    `, [mealPlan.id]);
    
    console.log(`\nMeal plan has ${recipesResult.rows.length} recipes.`);
    console.log('Recipe ingredients that should be in shopping list:');
    
    // Print out recipe ingredients
    let totalIngredients = 0;
    for (const recipe of recipesResult.rows) {
      console.log(`\n${recipe.name} (${recipe.meal_type}):`);
      
      if (Array.isArray(recipe.ingredients)) {
        totalIngredients += recipe.ingredients.length;
        
        for (const ingredient of recipe.ingredients) {
          console.log(`  • ${ingredient}`);
        }
      } else {
        console.log('  • No ingredients found or not in proper format.');
      }
    }
    
    console.log(`\nTotal recipe ingredients: ${totalIngredients}`);
    console.log(`Total shopping list items: ${shoppingListResult.rows.length}`);
    
    if (totalIngredients > shoppingListResult.rows.length) {
      console.log('\nWarning: There are more recipe ingredients than shopping list items.');
      console.log('This might indicate that ingredients aren\'t being merged properly.');
    } else if (totalIngredients < shoppingListResult.rows.length) {
      console.log('\nInfo: There are more shopping list items than recipe ingredients.');
      console.log('This could be due to additional manually added items or duplicates.');
    } else {
      console.log('\nSuccess: The number of ingredients matches the number of shopping list items.');
    }
    
    // Release the client
    client.release();
    console.log('\nTest completed.');
    
  } catch (error) {
    console.error('Error testing shopping list generation:', error);
  } finally {
    // Close the pool
    pool.end();
  }
}

// Run the test
testShoppingListGeneration().catch(console.error);