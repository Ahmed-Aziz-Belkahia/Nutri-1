// Test script for shopping list generation
import { parseIngredient, mergeIngredients, categorizeIngredient } from './server/utils/ingredients.js';

// Test ingredient parsing
console.log('Testing ingredient parsing:');
const ingredients = [
  '2 cups flour',
  '1/2 teaspoon salt',
  '3 tablespoons olive oil',
  '1 large onion',
  '2-3 cloves garlic',
  '1 can tomatoes'
];

ingredients.forEach(ingredient => {
  console.log(`Original: "${ingredient}" => Parsed:`, parseIngredient(ingredient));
});

// Test ingredient merging
console.log('\nTesting ingredient merging:');
const parsedIngredients = [
  { quantity: 2, unit: 'cups', name: 'flour', mealName: 'Pancakes', mealType: 'breakfast' },
  { quantity: 1, unit: 'cup', name: 'flour', mealName: 'Gravy', mealType: 'dinner' },
  { quantity: 1, unit: 'tablespoon', name: 'olive oil', mealName: 'Salad', mealType: 'lunch' },
  { quantity: 2, unit: 'tablespoons', name: 'olive oil', mealName: 'Roasted Vegetables', mealType: 'dinner' },
  { quantity: 1, unit: 'unit', name: 'egg', mealName: 'Pancakes', mealType: 'breakfast' },
  { quantity: 3, unit: 'unit', name: 'egg', mealName: 'Omelette', mealType: 'breakfast' }
];

const mergedResult = mergeIngredients(parsedIngredients);
console.log('Merged ingredients:');
mergedResult.forEach(item => {
  console.log(`- ${item.quantity} ${item.unit} ${item.name} (Used in: ${item.meals.join(', ')})`);
});

// Test ingredient categorization
console.log('\nTesting ingredient categorization:');
const testItems = [
  'chicken breast',
  'tomatoes',
  'cheddar cheese',
  'olive oil',
  'brown rice',
  'bread',
  'frozen peas',
  'canned beans',
  'potato chips',
  'coffee'
];

testItems.forEach(item => {
  console.log(`"${item}" => Category: ${categorizeIngredient(item)}`);
});