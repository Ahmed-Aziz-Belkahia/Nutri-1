/**
 * Service for generating shopping lists from meal plans
 */
import { categorizeIngredient, parseIngredient, mergeIngredients } from '../utils/ingredients';
import { db } from '@db';
import { recipes, recipesInMealPlan, shoppingListItems, recipes as recipesTable } from '@db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a consolidated weekly shopping list using AI
 */
export async function generateWeeklyShoppingList(mealPlanIds: number[], userId: number) {
  console.log(`Generating AI-powered weekly shopping list for ${mealPlanIds.length} meal plans`);
  
  // Fetch all recipes associated with ALL meal plans
  const mealPlanRecipes = await db
    .select({
      recipe: recipesTable,
      mealType: recipesInMealPlan.mealType,
      servingSize: recipesInMealPlan.servingSize,
      mealPlanId: recipesInMealPlan.mealPlanId,
    })
    .from(recipesInMealPlan)
    .innerJoin(recipesTable, eq(recipesInMealPlan.recipeId, recipesTable.id))
    .where(inArray(recipesInMealPlan.mealPlanId, mealPlanIds));
  
  console.log(`Found ${mealPlanRecipes.length} recipes across all meal plans`);
  
  // Build a structured list of all recipes with their ingredients
  const recipesForAI = mealPlanRecipes.map(({ recipe, servingSize }) => {
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
        console.warn(`Failed to parse ingredients for recipe ${recipe.id}`);
      }
    }
    
    return {
      name: recipe.name,
      servings: parseFloat(servingSize?.toString() || "1"),
      ingredients: ingredientsArray
    };
  });
  
  // Ask AI to consolidate all ingredients into a shopping list
  const prompt = `You are a shopping list generator. Given a list of recipes for an entire week, consolidate all ingredients into a single shopping list.

IMPORTANT RULES:
1. Merge duplicate ingredients (e.g., "chicken breast 6oz" + "chicken breast boneless 8oz" = "chicken breast 400g")
2. Convert all measurements to metric (grams, ml, liters)
3. Remove qualifiers like "boneless", "skinless", "ripe", etc - just the core ingredient
4. Sum quantities correctly across all recipes
5. Use singular form (e.g., "avocado" not "avocados")
6. Keep ingredient names simple and clean

Here are the recipes for the week:
${recipesForAI.map((r, i) => `
Recipe ${i + 1}: ${r.name} (${r.servings} servings)
Ingredients:
${r.ingredients.map(ing => `- ${ing}`).join('\n')}
`).join('\n')}

Return ONLY a JSON array of consolidated ingredients in this format:
[
  {"name": "chicken breast", "quantity": 800, "unit": "g"},
  {"name": "avocado", "quantity": 3, "unit": "unit"},
  {"name": "olive oil", "quantity": 100, "unit": "ml"}
]

Make sure to:
- Combine "chicken breast boneless" + "chicken breast" → "chicken breast"
- Convert oz to grams (1oz = 28g)
- Sum all quantities properly
- Remove variations like "ripe", "fresh", "chopped" from names`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that consolidates shopping lists. Always return valid JSON arrays."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }
    
    // Parse the AI response
    let consolidatedIngredients: Array<{name: string; quantity: number; unit: string}> = [];
    try {
      const parsed = JSON.parse(responseContent);
      // Handle if AI returns {ingredients: [...]} or just [...]
      consolidatedIngredients = Array.isArray(parsed) ? parsed : (parsed.ingredients || []);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback to manual parsing
      return await generateWeeklyShoppingListFallback(mealPlanIds, userId);
    }
    
    console.log(`AI consolidated into ${consolidatedIngredients.length} unique items`);
    
    // Delete existing shopping list
    await db.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId));
    
    // Insert consolidated items
    const shoppingListEntries = [];
    for (const item of consolidatedIngredients) {
      try {
        const [newItem] = await db
          .insert(shoppingListItems)
          .values({
            userId: userId,
            name: item.name,
            quantity: `${item.quantity} ${item.unit}`,
            category: categorizeIngredient(item.name),
            isChecked: false,
            meal_plan_id: mealPlanIds[0],
            unit: item.unit,
            ingredient: item.name
          })
          .returning();
        
        shoppingListEntries.push(newItem);
      } catch (error) {
        console.error(`Error inserting item ${item.name}:`, error);
      }
    }
    
    console.log(`Created ${shoppingListEntries.length} AI-consolidated shopping list items`);
    
    // Group by category
    const groupedItems = shoppingListEntries.reduce((acc, item) => {
      const category = item.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof shoppingListEntries>);
    
    return { items: shoppingListEntries, groupedItems };
    
  } catch (error) {
    console.error('AI shopping list generation failed:', error);
    // Fallback to manual method
    return await generateWeeklyShoppingListFallback(mealPlanIds, userId);
  }
}

/**
 * Fallback method using manual ingredient parsing (original logic)
 */
async function generateWeeklyShoppingListFallback(mealPlanIds: number[], userId: number) {
  console.log(`Using fallback method for shopping list generation`);
  
  
  // Fetch all recipes associated with ALL meal plans
  const mealPlanRecipes = await db
    .select({
      recipe: recipesTable,
      mealType: recipesInMealPlan.mealType,
      servingSize: recipesInMealPlan.servingSize,
      mealPlanId: recipesInMealPlan.mealPlanId,
    })
    .from(recipesInMealPlan)
    .innerJoin(recipesTable, eq(recipesInMealPlan.recipeId, recipesTable.id))
    .where(inArray(recipesInMealPlan.mealPlanId, mealPlanIds));
  
  console.log(`Found ${mealPlanRecipes.length} recipes across all meal plans`);
  
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
  
  // Merge similar ingredients (this aggregates quantities across the week)
  const mergedIngredients = mergeIngredients(allIngredients);
  
  console.log(`Merged into ${mergedIngredients.length} unique shopping list items for the week`);
  
  // Delete any existing shopping list items for this user
  try {
    const existingItems = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.userId, userId));
    
    console.log(`Found ${existingItems.length} existing shopping list items for user`);
    
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
    const primaryMealType = item.mealTypes.length > 0 ? item.mealTypes[0] : 'other';
    const primaryMealName = item.meals.length > 0 ? item.meals[0] : '';
    
    const associatedRecipe = mealPlanRecipes.find(r => r.recipe.name === primaryMealName);
    const recipeImage = associatedRecipe?.recipe.imageUrl || '';
    
    const formattedQuantity = `${item.quantity} ${item.unit}`;
    
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
          meal_plan_id: mealPlanIds[0], // Reference the first meal plan (could be any)
          customImage: recipeImage,
          meal_type: primaryMealType,
          recipe_name: primaryMealName,
          recipe_image: recipeImage,
          unit: item.unit,
          ingredient: item.name
        })
        .returning();
      
      shoppingListEntries.push(newItem);
    } catch (error) {
      console.error(`Error inserting shopping list item ${item.name}:`, error);
    }
  }
  
  console.log(`Created ${shoppingListEntries.length} shopping list items for the week`);
  
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

/**
 * Generate a shopping list for a given meal plan (single day - kept for backward compatibility)
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