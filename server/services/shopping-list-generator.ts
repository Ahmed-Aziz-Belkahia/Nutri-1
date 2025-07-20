/**
 * Service for generating shopping lists from meal plans
 */
import { categorizeIngredient, parseIngredient, mergeIngredients } from '../utils/ingredients';
import { db } from '@db';
import { recipes, recipesInMealPlan, shoppingListItems, recipes as recipesTable } from '@db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Generate a shopping list for a given meal plan
 */
export async function generateShoppingListFromMealPlan(mealPlanId: number, userId: number) {
  console.log(`Generating shopping list for meal plan ID: ${mealPlanId}`);
  
  // Fetch all recipes associated with this meal plan
  const mealPlanRecipes = await db
    .select({
      recipe: recipesTable,
      mealType: recipesInMealPlan.mealType,
      servingSize: recipesInMealPlan.servingSize,
    })
    .from(recipesInMealPlan)
    .innerJoin(recipesTable, eq(recipesInMealPlan.recipeId, recipesTable.id))
    .where(eq(recipesInMealPlan.mealPlanId, mealPlanId));
  
  console.log(`Found ${mealPlanRecipes.length} recipes in the meal plan`);
  
  // Extract and parse all ingredients
  const allIngredients: Array<{
    quantity: number;
    unit: string;
    name: string;
    mealName: string;
    mealType: string;
  }> = [];
  
  for (const { recipe, mealType, servingSize } of mealPlanRecipes) {
    const numericServingSize = parseFloat(servingSize?.toString() || "1");
    
    // Ensure ingredients is an array
    let ingredientsArray: string[] = [];
    if (Array.isArray(recipe.ingredients)) {
      ingredientsArray = recipe.ingredients;
    } else if (typeof recipe.ingredients === 'string') {
      try {
        const parsed = JSON.parse(recipe.ingredients as string);
        if (Array.isArray(parsed)) {
          ingredientsArray = parsed;
        }
      } catch (error) {
        console.warn(`Failed to parse ingredients for recipe ${recipe.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        ingredientsArray = [];
      }
    }
    
    // Skip if no ingredients
    if (ingredientsArray.length === 0) {
      console.warn(`No ingredients found for recipe ${recipe.name} (ID: ${recipe.id})`);
      continue;
    }
    
    // Parse each ingredient
    for (const ingredient of ingredientsArray) {
      const parsedIngredient = parseIngredient(ingredient);
      
      // Apply serving size multiplier
      parsedIngredient.quantity *= numericServingSize;
      
      // Add meal context
      allIngredients.push({
        ...parsedIngredient,
        mealName: recipe.name,
        mealType: mealType
      });
    }
  }
  
  console.log(`Extracted ${allIngredients.length} ingredients from all recipes`);
  
  // Merge similar ingredients
  const mergedIngredients = mergeIngredients(allIngredients);
  
  console.log(`Merged into ${mergedIngredients.length} unique shopping list items`);
  
  // Delete any existing shopping list items for this meal plan
  try {
    // First try to get all existing items for this plan to delete them
    const existingItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.userId, userId));
    
    console.log(`Found ${existingItems.length} existing shopping list items for user`);
    
    // Delete them
    if (existingItems.length > 0) {
      await db
        .delete(shoppingListItems)
        .where(eq(shoppingListItems.userId, userId));
    }
  } catch (error) {
    console.error('Error while cleaning up existing shopping list items:', error);
  }
  
  // Insert shopping list items
  const shoppingListEntries = [];
  
  for (const item of mergedIngredients) {
    // Determine which meal to associate this ingredient with (use the first one)
    const primaryMealType = item.mealTypes.length > 0 ? item.mealTypes[0] : 'other';
    const primaryMealName = item.meals.length > 0 ? item.meals[0] : '';
    
    // Find recipe image if available
    const associatedRecipe = mealPlanRecipes.find(r => r.recipe.name === primaryMealName);
    const recipeImage = associatedRecipe?.recipe.imageUrl || '';
    
    // Format the quantity and unit in the name
    const formattedQuantity = `${item.quantity} ${item.unit}`;
    
    // Insert the shopping list item - only include fields we know exist in the table
    try {
      const [newItem] = await db
        .insert(shoppingListItems)
        .values({
          userId: userId,
          name: item.name,
          quantity: formattedQuantity,
          category: categorizeIngredient(item.name),
          isChecked: false,
          created_at: new Date(),
          updated_at: new Date(),
          meal_plan_id: mealPlanId, // Add the meal plan ID to associate with correct plan
          customImage: recipeImage, // Recipe image for display
          meal_type: primaryMealType, // Store the meal type (breakfast, lunch, dinner)
          recipe_name: primaryMealName, // Store which recipe this ingredient is for
          recipe_image: recipeImage, // Duplicate of customImage for compatibility
          unit: item.unit, // Add the unit separately
          ingredient: item.name // Add the raw ingredient name
        })
        .returning();
      
      shoppingListEntries.push(newItem);
    } catch (error) {
      console.error(`Error inserting shopping list item ${item.name}:`, error);
    }
  }
  
  console.log(`Created ${shoppingListEntries.length} shopping list items`);
  
  // Group items by category for easier display
  const groupedItems = shoppingListEntries.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof shoppingListEntries>);
  
  return {
    items: shoppingListEntries,
    groupedItems
  };
}