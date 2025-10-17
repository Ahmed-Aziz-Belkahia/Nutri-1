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
  
  // Flatten all ingredients into a single list
  const allIngredients = recipesForAI.flatMap(r => 
    r.ingredients.map(ing => `${ing} (for ${r.servings} servings)`)
  );
  
  console.log(`Total ingredients to consolidate: ${allIngredients.length}`);
  
  // Ask AI to consolidate all ingredients into a shopping list
  const prompt = `You are a smart grocery shopping assistant. I need you to consolidate this list of ingredients from multiple recipes into a single, clean shopping list.

RULES:
1. Combine duplicate ingredients (same item = one entry)
2. Add up all quantities 
3. Remove descriptors like "fresh", "ripe", "chopped", "diced", "boneless"
4. Convert everything to metric (oz → grams, cups → ml)
5. Use singular form (banana not bananas)

Example:
Input: ["2 ripe bananas", "1 banana sliced", "3 bananas"]
Output: {"name": "banana", "quantity": 6, "unit": "unit"}

Input: ["6oz chicken breast boneless", "8oz chicken breast"]  
Output: {"name": "chicken breast", "quantity": 392, "unit": "g"}

Here are ALL the ingredients from the week's recipes:

${allIngredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

Return ONLY a JSON object with this exact structure:
{
  "shoppingList": [
    {"name": "ingredient name", "quantity": number, "unit": "g|ml|unit|kg|L"},
    {"name": "ingredient name", "quantity": number, "unit": "g|ml|unit|kg|L"}
  ]
}

IMPORTANT: 
- Each ingredient should appear EXACTLY ONCE
- Combine "chicken breast" + "chicken breast boneless" into ONE "chicken breast" entry
- Combine "banana" + "banana sliced" + "bananas" into ONE "banana" entry
- Return valid JSON only, no explanation text`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a grocery shopping assistant that creates consolidated shopping lists. You always return valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }
    
    console.log('AI Shopping List Raw Response:', responseContent.substring(0, 500)); // Log first 500 chars
    
    // Parse the AI response
    let consolidatedIngredients: Array<{name: string; quantity: number; unit: string}> = [];
    try {
      const parsed = JSON.parse(responseContent);
      console.log('Parsed AI response structure:', {
        isArray: Array.isArray(parsed),
        keys: Object.keys(parsed),
        hasIngredients: 'ingredients' in parsed,
        hasItems: 'items' in parsed,
        hasList: 'list' in parsed,
        hasShopping: 'shopping' in parsed,
        hasShoppingList: 'shoppingList' in parsed
      });
      
      // Handle multiple possible response formats
      consolidatedIngredients = Array.isArray(parsed) 
        ? parsed 
        : (parsed.shoppingList || parsed.ingredients || parsed.items || parsed.list || parsed.shopping || []);
      
      console.log(`Extracted ${consolidatedIngredients.length} items from AI response`);
      
      // Validate that we got actual items
      if (!Array.isArray(consolidatedIngredients) || consolidatedIngredients.length === 0) {
        console.error('AI returned empty or invalid shopping list, falling back to manual parsing');
        return await generateWeeklyShoppingListFallback(mealPlanIds, userId);
      }
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