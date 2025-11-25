/**
 * Service for generating shopping lists from meal plans
 */
import { categorizeIngredient, parseIngredient, mergeIngredients } from '../utils/ingredients';
import { db } from '@db';
import { recipes, recipesInMealPlan, shoppingListItems, recipes as recipesTable } from '@db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import OpenAI from 'openai';
import { trackOpenAIUsage, trackFailedRequest } from '../utils/token-tracker';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Manual deduplication post-processing to catch AI failures
 * Aggressively merges similar ingredient names
 */
function manualDeduplicate(items: Array<{name: string; quantity: number; unit: string}>): Array<{name: string; quantity: number; unit: string}> {
  const normalized = new Map<string, {quantity: number; unit: string; originalName: string}>();
  
  for (const item of items) {
    // Normalize the ingredient name by:
    // 1. Lowercase
    // 2. Remove descriptors (fresh, chopped, sliced, diced, minced, grated, crumbled, etc.)
    // 3. Remove measurements from name (1/4 cup, 1/2, etc.)
    // 4. Trim and normalize spacing
    let normalizedName = item.name
      .toLowerCase()
      .replace(/\b(fresh|chopped|sliced|diced|minced|grated|crumbled|halved|peeled|trimmed|boneless|skinless|ripe|large|medium|small|extra virgin|cooked|raw|whole|ground|canned)\b/g, '')
      .replace(/\d+\/\d+\s*(cup|tablespoon|teaspoon|tbsp|tsp|oz|pound|lb)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Additional specific normalizations
    normalizedName = normalizedName
      .replace(/cucumbers?/i, 'cucumber')
      .replace(/tomatoes?/i, 'tomato')
      .replace(/avocados?/i, 'avocado')
      .replace(/peppers?/i, 'pepper')
      .replace(/bell peppers?/i, 'bell pepper')
      .replace(/red bell peppers?/i, 'bell pepper')
      .replace(/mixed bell peppers?/i, 'bell pepper')
      .replace(/eggs?/i, 'egg')
      .replace(/cloves?/i, 'clove')
      .replace(/fillets?/i, 'fillet')
      .replace(/breasts?/i, 'breast')
      .replace(/florets?/i, 'floret');
    
    // If already exists, sum quantities
    if (normalized.has(normalizedName)) {
      const existing = normalized.get(normalizedName)!;
      // Sum quantities (assuming same unit for now - AI should have already normalized units)
      existing.quantity += item.quantity;
    } else {
      normalized.set(normalizedName, {
        quantity: item.quantity,
        unit: item.unit,
        originalName: item.name // Keep first occurrence's name for display
      });
    }
  }
  
  // Convert back to array
  return Array.from(normalized.entries()).map(([name, data]) => ({
    name: name,
    quantity: data.quantity,
    unit: data.unit
  }));
}

/**
 * Generate a consolidated weekly shopping list using AI
 */
export async function generateWeeklyShoppingList(mealPlanIds: number[], userId: number, trackTokens: boolean = true) {
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
  const prompt = `TASK: Consolidate duplicate ingredients into ONE entry each. Merge quantities.

MANDATORY DEDUPLICATION - Read each input and identify base ingredient:

"cucumber sliced" = cucumber
"cucumber diced" = cucumber  
"cucumber slices" = cucumber
"cucumbers diced" = cucumber
→ OUTPUT: ONE "cucumber" entry with total quantity

"olive oil" = olive oil
"extra virgin olive oil" = olive oil
→ OUTPUT: ONE "olive oil" entry with total quantity

"feta cheese" = feta cheese
"feta cheese crumbled" = feta cheese
"crumbled feta" = feta cheese
→ OUTPUT: ONE "feta cheese" entry with total quantity

"bell pepper diced" = bell pepper
"bell peppers diced" = bell pepper
"red bell pepper diced" = bell pepper
"pepper sliced" = bell pepper
"mixed bell peppers" = bell pepper
→ OUTPUT: ONE "bell pepper" entry with total quantity

"boneless chicken breast" = chicken breast
"boneless skinless chicken breast" = chicken breast
"chicken breast" = chicken breast
→ OUTPUT: ONE "chicken breast" entry with total quantity

UNIT CONVERSIONS (sum all to same unit):
- tbsp = tablespoon = 15ml
- tsp = teaspoon = 5ml
- cup = 240ml
- 1/2 cup = 120ml
- 1/4 cup = 60ml
- oz = 28g
- lb = pound = 454g

STRIP PREPARATION WORDS:
Remove: fresh, chopped, sliced, diced, minced, grated, crumbled, halved, peeled, trimmed, boneless, skinless, ripe, large, medium, small

ALGORITHM:
1. For each input ingredient, extract the BASE FOOD ITEM (ignore all descriptors)
2. Group ALL inputs with same base item
3. Sum quantities (convert units if needed)
4. Output ONE entry per base item

CRITICAL: If you output "cucumber" twice, you FAILED. Each base ingredient = ONE output line.

Ingredients to consolidate (${allIngredients.length} total):
${allIngredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

OUTPUT FORMAT (JSON only):
{
  "shoppingList": [
    {"name": "base ingredient name", "quantity": total_number, "unit": "g|ml|unit"}
  ]
}

FINAL CHECK: Count output entries. Each "name" value must be unique. No duplicates allowed.`;

  try {
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a grocery shopping consolidation expert. Your ONLY job is to merge duplicate ingredients. CRITICAL: Each ingredient must appear EXACTLY ONCE in the output. If cucumber appears 5 times in input, it must appear ONCE in output with the summed quantity. NO EXCEPTIONS."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    // Track token usage if trackTokens is enabled
    if (trackTokens && completion.usage) {
      await trackOpenAIUsage(userId, '/api/shopping-list/generate', completion, 'gpt-4o-mini', startTime);
    }
    
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
    
    // MANUAL DEDUPLICATION POST-PROCESSING (in case AI fails)
    const deduplicated = manualDeduplicate(consolidatedIngredients);
    console.log(`After manual deduplication: ${deduplicated.length} items (removed ${consolidatedIngredients.length - deduplicated.length} duplicates)`);
    
    // Delete existing shopping list
    await db.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId));
    
    // Insert consolidated items
    const shoppingListEntries = [];
    for (const item of deduplicated) {
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