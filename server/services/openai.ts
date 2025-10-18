import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || '' // Use empty string as fallback to avoid null errors
});

// Food recognition from image
export async function recognizeFoodFromImage(base64Image: string): Promise<{
  foods: Array<{
    name: string;
    confidence: number;
    estimated_weight?: string;
    preparation?: string;
  }>;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this food image and identify all food items present. For each item, provide the name, confidence level (0-1), estimated portion/weight if visible, and preparation method if apparent. Return as JSON with format: { foods: [{ name: string, confidence: number, estimated_weight?: string, preparation?: string }] }"
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || '{"foods":[]}';
  return JSON.parse(content);
}

// Text-based food analysis
export async function analyzeFoodText(foodDescription: string): Promise<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  components: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string;
    quantity?: number;
    details?: {
      type?: string;
      preparation?: string;
      estimatedWeight?: string;
    };
  }>;
}> {
  console.log(`[Food Text Analysis] Analyzing text: "${foodDescription}"`);
  
  try {
    // Check API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      throw new Error('OpenAI API key is missing or empty');
    }
    
    // Ensure food description is valid
    if (!foodDescription || foodDescription.trim() === '') {
      throw new Error('Food description is empty or invalid');
    }
    
    // Make API call to OpenAI
    console.log('[Food Text Analysis] Sending request to OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a precise food analysis system that breaks down food descriptions into nutritional components. Your expertise is in analyzing food descriptions and providing accurate nutritional information."
        },
        {
          role: "user",
          content: `Analyze this food description and break it down into components with nutritional information. 
          Description: "${foodDescription}"
          
          Return ONLY a valid JSON object with this exact structure. Do not include any other text:
          {
            "name": "Create a specific, descriptive name based on the food items",
            "calories": sum_of_all_component_calories,
            "protein": sum_of_all_component_protein,
            "carbs": sum_of_all_component_carbs,
            "fat": sum_of_all_component_fat,
            "confidence": number_between_0_and_1,
            "components": [
              {
                "name": "Specific item name",
                "calories": item_calories,
                "protein": protein_grams,
                "carbs": carbs_grams,
                "fat": fat_grams,
                "servingSize": "Precise measurement",
                "quantity": number_of_units,
                "details": {
                  "type": "Food category",
                  "preparation": "How it's prepared",
                  "estimatedWeight": "Estimated weight in grams"
                }
              }
            ]
          }
          
          IMPORTANT:
          1. For the main "name" field, create a descriptive and specific meal name that accurately describes the food, NOT "Overall food description" or generic names
          2. For example, use "Grilled Chicken with Brown Rice" or "Turkey Sandwich with Avocado" instead of "Overall food description"
          3. Make sure all numeric values are actual numbers (not strings) and all fields are present
          4. Be very specific and detailed with the component names
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more consistent results
    });

    // Get response content
    const content = response.choices[0].message.content;
    console.log(`[Food Text Analysis] Analysis complete. Content: ${content}`);
    
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }
    
    // Parse the response
    try {
      const result = JSON.parse(content);
      
      // Validate the essential fields
      if (typeof result.name !== 'string' || 
          typeof result.calories !== 'number' || 
          typeof result.protein !== 'number' || 
          typeof result.carbs !== 'number' || 
          typeof result.fat !== 'number' ||
          !Array.isArray(result.components)) {
        throw new Error('Invalid response format: missing required fields');
      }
      
      // If the name is still "Overall food description" or other generic phrases, try to create a better one
      let betterName = result.name;
      if (betterName === "Overall food description" || betterName === "Food description" || betterName === "Meal") {
        if (Array.isArray(result.components) && result.components.length > 0) {
          const componentNames = result.components.map(c => c.name).filter(Boolean);
          if (componentNames.length > 0) {
            betterName = componentNames.slice(0, 3).join(' with ');
          } else {
            betterName = foodDescription.slice(0, 50); // Use the original description as fallback
          }
        } else {
          betterName = foodDescription.slice(0, 50); // Use the original description as fallback
        }
      }
      
      // Return validated result with better name
      return {
        name: betterName,
        calories: Math.max(0, Math.round(result.calories)),
        protein: Math.max(0, Math.round(result.protein * 10) / 10),
        carbs: Math.max(0, Math.round(result.carbs * 10) / 10),
        fat: Math.max(0, Math.round(result.fat * 10) / 10),
        confidence: typeof result.confidence === 'number' ? 
          Math.min(1, Math.max(0, result.confidence)) : 0.8,
        components: Array.isArray(result.components) ? result.components.map(component => ({
          name: component.name || 'Unknown component',
          calories: Math.max(0, Math.round(component.calories || 0)),
          protein: Math.max(0, Math.round((component.protein || 0) * 10) / 10),
          carbs: Math.max(0, Math.round((component.carbs || 0) * 10) / 10),
          fat: Math.max(0, Math.round((component.fat || 0) * 10) / 10),
          ...(component.servingSize ? { servingSize: component.servingSize } : {}),
          ...(component.quantity ? { quantity: component.quantity } : {}),
          ...(component.details ? { details: component.details } : {})
        })) : []
      };
    } catch (parseError) {
      console.error('[Food Text Analysis] JSON parsing error:', parseError);
      console.error('[Food Text Analysis] Raw content:', content);
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('[Food Text Analysis] Error:', error);
    throw error;
  }
}

// Nutritional analysis
export async function analyzeNutrition(foodItems: Array<{ 
  name: string;
  quantity?: number;
  unit?: string;
}>): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  components: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    details?: {
      type?: string;
      preparation?: string;
      estimatedWeight?: string;
    };
  }>;
}> {
  const itemsDescription = foodItems.map(item => 
    `${item.quantity || 1} ${item.unit || 'serving'} of ${item.name}`
  ).join(', ');

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a nutrition expert. Analyze the given food items and provide detailed nutritional information in JSON format."
      },
      {
        role: "user",
        content: `Analyze the nutritional content of: ${itemsDescription}. Return detailed macronutrients and per-component breakdown.`
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || '{"calories":0,"protein":0,"carbs":0,"fat":0,"components":[]}';
  return JSON.parse(content);
}

// Meal planning
export async function generateMealPlan(preferences: {
  calorieGoal: number;
  dietaryType: string;
  allergies: string[];
  excludedIngredients: string[];
}): Promise<{
  meals: {
    breakfast: Array<{ name: string; calories: number }>;
    lunch: Array<{ name: string; calories: number }>;
    dinner: Array<{ name: string; calories: number }>;
    snacks?: Array<{ name: string; calories: number }>;
  };
  totalCalories: number;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a nutrition and meal planning expert specializing in creating varied, appetizing meal plans. When naming meals, use descriptive, appealing names that highlight key flavors, cooking methods, or main ingredients. For example, use names like 'Mediterranean Quinoa Bowl with Roasted Vegetables', 'Honey-Glazed Salmon with Wild Rice', or 'Creamy Mushroom Risotto with Fresh Herbs' instead of generic names like 'Fish Dish' or 'Rice Bowl'. Each day in a meal plan must feature distinctly different types of meals using diverse main ingredients, cooking methods, and flavor profiles."
      },
      {
        role: "user",
        content: `Create a meal plan with the following requirements:
          - Daily calorie goal: ${preferences.calorieGoal}
          - Dietary type: ${preferences.dietaryType}
          - Allergies: ${preferences.allergies.join(', ')}
          - Excluded ingredients: ${preferences.excludedIngredients.join(', ')}
          
          IMPORTANT: I need maximum variety in my meal plan! For each meal category (breakfast, lunch, dinner):
          - Use different main protein sources across the week
          - Incorporate diverse cooking methods (baking, grilling, sautéing, etc.)
          - Include a variety of global cuisines and flavor profiles
          - Create completely different meal types (not just variations of the same dish)
          
          Return the meal plan in JSON format with breakfast, lunch, dinner, optional snacks, and calorie counts.`
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || '{"meals":{"breakfast":[],"lunch":[],"dinner":[]},"totalCalories":0}';
  return JSON.parse(content);
}

// Meal planning with specific meals
export async function generateMealPlanWithRecipes(preferences: {
  dietaryType: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies: string[];
  excludedIngredients: string[];
  maxCookingTime: number;
  budgetPreference: string;
  preferredIngredients: string[];
  healthGoals?: string[];
  cuisinePreferences?: string[];
  cookingSkillLevel?: string;
  mealPlanDuration?: string;
  weekdayVsWeekend?: string;
  cookingEquipment?: string[];
  specialRequirements?: string;
  language?: string; // Add language preference
}): Promise<{
  meals: Array<{
    name: string;
    mealType: string;
    recipe: {
      ingredients: string[];
      instructions: string[];
      prepTime: number;
      nutritionInfo: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };
  }>;
  totalCalories: number;
}> {
  // Determine language for meal plan generation - FORCE ENGLISH
  const language = 'en'; // Always use English
  const isPolish = false; // Never use Polish
  
  console.log(`Generating meal plan in English language`);
  
  // Ensure arrays are properly formatted
  const allergies = Array.isArray(preferences.allergies) ? preferences.allergies : [];
  const healthGoals = Array.isArray(preferences.healthGoals) ? preferences.healthGoals : [];
  const cuisinePreferences = Array.isArray(preferences.cuisinePreferences) ? preferences.cuisinePreferences : [];
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a nutrition expert creating simple, quick meal plans. Create meal plans in English.

Guidelines:
1) Create simple, practical meals that are quick to prepare
2) Use common, easily available ingredients
3) Keep cooking times under 30 minutes
4) Use descriptive meal names like "Herb Scrambled Eggs", "Grilled Chicken Breast", "Vegetable Soup"
5) Focus on nutritional balance rather than complexity
6) Use standard measurements (cups, tablespoons, etc.)`
      },
      {
        role: "user",
        content: `Create a simple 1-day meal plan with ${preferences.mealsPerDay} meals (${preferences.calorieTarget} calories total).
          
          Diet: ${preferences.dietaryType}
          Allergies: ${allergies.join(', ') || 'None'}
          Health Goals: ${healthGoals.join(', ') || 'General health'}
          Cuisine Preferences: ${cuisinePreferences.join(', ') || 'Any'}
          Cooking Skill Level: ${preferences.cookingSkillLevel || 'intermediate'}
          
          Create ${preferences.mealsPerDay} simple meals:
          ${preferences.mealsPerDay >= 1 ? '- 1 breakfast' : ''}
          ${preferences.mealsPerDay >= 2 ? '- 1 lunch' : ''}
          ${preferences.mealsPerDay >= 3 ? '- 1 dinner' : ''}
          ${preferences.mealsPerDay >= 4 ? '- 1 snack' : ''}
          
          JSON format: {"meals": [{"name": "Meal Name", "mealType": "breakfast/lunch/dinner/snack", "recipe": {"ingredients": ["ingredient1", "ingredient2"], "instructions": ["step1", "step2"], "prepTime": 15, "nutritionInfo": {"calories": 400, "protein": 20, "carbs": 30, "fat": 10}}}], "totalCalories": ${preferences.calorieTarget}}`
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || '{"meals":[],"totalCalories":0}';
  
  // Only log OpenAI response in development or if there's an error
  if (process.env.NODE_ENV === 'development') {
    console.log("OpenAI response received:", content.slice(0, 200) + '...');
  }
  
  // Save the full raw response to a log file for debugging (only on errors)
  const result = JSON.parse(content);
  
  // Only log structure if there's an issue
  if (!result.meals || result.meals.length === 0) {
    console.warn("OpenAI returned empty meal plan:", {
      mealsCount: result.meals?.length || 0,
      firstMealSample: result.meals?.[0] ? {
        name: result.meals[0].name,
        mealType: result.meals[0].mealType,
        recipeFull: result.meals[0].recipe,
        hasIngredients: Array.isArray(result.meals[0].recipe?.ingredients) && result.meals[0].recipe.ingredients.length > 0,
        hasInstructions: Array.isArray(result.meals[0].recipe?.instructions) && result.meals[0].recipe.instructions.length > 0,
        ingredientsSample: Array.isArray(result.meals[0].recipe?.ingredients) ? result.meals[0].recipe.ingredients.slice(0, 2) : null,
        instructionsSample: Array.isArray(result.meals[0].recipe?.instructions) ? result.meals[0].recipe.instructions.slice(0, 2) : null
      } : null
    });
  }

  // Ensure the response matches our expected format and ingredients/instructions are arrays
  return {
    meals: result.meals.map((meal: any) => ({
      name: meal.name,
      mealType: meal.mealType.toLowerCase(),
      recipe: {
        ingredients: Array.isArray(meal.recipe?.ingredients) ? meal.recipe.ingredients : [],
        instructions: Array.isArray(meal.recipe?.instructions) ? meal.recipe.instructions : [],
        prepTime: meal.recipe?.prepTime || 30,
        nutritionInfo: {
          calories: meal.recipe?.nutritionInfo?.calories || 500,
          protein: meal.recipe?.nutritionInfo?.protein || 25,
          carbs: meal.recipe?.nutritionInfo?.carbs || 50,
          fat: meal.recipe?.nutritionInfo?.fat || 20
        }
      }
    })),
    totalCalories: result.totalCalories
  };
}

// Generate a monthly meal plan with detailed recipes for each day
export async function generateMonthlyMealPlan(preferences: {
  dietaryType: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies: string[];
  excludedIngredients: string[];
  maxCookingTime: number;
  budgetPreference: string;
  preferredIngredients: string[];
  healthGoals?: string[];
  cuisinePreferences?: string[];
  cookingSkillLevel?: string;
  weekdayVsWeekend?: string;
  cookingEquipment?: string[];
  specialRequirements?: string;
  duration?: string;
  language?: string; // Add language preference
}): Promise<{
  plan: Array<{
    date: string;
    dayOfWeek: string;
    meals: Array<{
      name: string;
      mealType: string;
      recipe: {
        ingredients: string[];
        instructions: string[];
        prepTime: number;
        nutritionInfo: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      };
    }>;
    totalDailyCalories: number;
  }>;
}> {
  // Calculate how many days to generate based on the duration
  const requestedDays = preferences.duration === '3days' ? 3 : 
                         preferences.duration === 'week' ? 7 : 
                         preferences.duration === 'twoWeeks' ? 14 : 3; // Default to 3 days to avoid timeouts
  
  // We'll generate the plans in batches to avoid token limitations
  const batchSize = 3; // Generate in batches of 3 days to stay within token limits
  const batches = Math.ceil(requestedDays / batchSize);
  let result: { plan: any[] } = { plan: [] };
  let generatedDays = 0;
  
  // Use these arrays to track what we've already generated to ensure variety
  const usedBreakfastNames: string[] = [];
  const usedLunchNames: string[] = [];
  const usedDinnerNames: string[] = [];
  
  console.log(`Generating ${requestedDays} days of meal plans in ${batches} batches of ${batchSize} days`);
  
  // Generate meal plans in batches
  for (let batch = 0; batch < batches; batch++) {
    // Calculate days remaining and adjust batch size for the last batch if needed
    const daysRemaining = requestedDays - generatedDays;
    const currentBatchSize = Math.min(batchSize, daysRemaining);
    
    // Skip if we've already generated all days
    if (currentBatchSize <= 0) break;
    
    console.log(`Generating batch ${batch + 1}/${batches} with ${currentBatchSize} days (days ${generatedDays + 1}-${generatedDays + currentBatchSize})`);
    
    // Determine language for meal plan generation
    const language = preferences.language || 'en';
    const isPolish = language === 'pl';
    
    console.log(`Generating ${currentBatchSize} days of meal plan in ${isPolish ? 'Polish' : 'English'} language (batch ${batch + 1}/${batches})`);
    
    // Build the prompt for this batch
    // Include information about already generated meals to ensure variety
    const varietyConstraints = isPolish
      ? `
      ZAPEWNIENIE RÓŻNORODNOŚCI Z WCZEŚNIEJ WYGENEROWANYMI DNIAMI:
      Do tej pory stworzyłem już ${generatedDays} dni planów posiłków dla tego użytkownika.
      Aby zapewnić pełną różnorodność przez wszystkie ${requestedDays} dni, NIGDY nie używaj koncepcji posiłków podobnych do tych wcześniej wygenerowanych:
      
      Poprzednie śniadania: ${usedBreakfastNames.join(', ')}
      Poprzednie obiady: ${usedLunchNames.join(', ')}
      Poprzednie kolacje: ${usedDinnerNames.join(', ')}
      
      KRYTYCZNE: Stwórz CAŁKOWICIE RÓŻNE rodzaje posiłków od tych wymienionych.
      `
      : `
      ENSURING VARIETY WITH PREVIOUSLY GENERATED DAYS:
      So far, I've already created ${generatedDays} days of meal plans for this user. 
      To ensure complete variety across all ${requestedDays} days, NEVER use meal concepts similar to these previously generated meals:
      
      Previous breakfasts: ${usedBreakfastNames.join(', ')}
      Previous lunches: ${usedLunchNames.join(', ')}
      Previous dinners: ${usedDinnerNames.join(', ')}
      
      CRITICAL: Create COMPLETELY DIFFERENT types of meals from these.
      `;
    
    const prompt = isPolish
      ? `
      Jesteś profesjonalnym dietetykiem i ekspertem w planowaniu posiłków, którego zadaniem jest stworzenie spersonalizowanego planu posiłków na dni od ${generatedDays + 1} do ${generatedDays + currentBatchSize} z ${requestedDays}-dniowego planu.
      
      Stwórz kompleksowy plan posiłków na DOKŁADNIE ${currentBatchSize} dni z tymi wymaganiami:
      - Typ diety: ${preferences.dietaryType}
      - Dzienny cel kaloryczny: ${preferences.calorieTarget} kalorii
      - Liczba posiłków dziennie: ${preferences.mealsPerDay}
      - Maksymalny czas gotowania na posiłek: ${preferences.maxCookingTime} minut
      - Preferencje budżetowe: ${preferences.budgetPreference}
      - Cele zdrowotne: ${Array.isArray(preferences.healthGoals) ? preferences.healthGoals.join(', ') : preferences.healthGoals || 'Nie określono'}
      - Preferencje kuchni: ${Array.isArray(preferences.cuisinePreferences) ? preferences.cuisinePreferences.join(', ') : preferences.cuisinePreferences || 'Dowolne'}
      - Poziom umiejętności gotowania: ${preferences.cookingSkillLevel || 'Średniozaawansowany'}
      
      WAŻNE: Twoja odpowiedź MUSI zawierać DOKŁADNIE ${currentBatchSize} dni w planie posiłków. To jest krytyczny wymóg.
      
      Ograniczenia i preferencje:
      - Alergie do unikania: ${Array.isArray(preferences.allergies) ? preferences.allergies.join(', ') : preferences.allergies || 'Brak'}
      - Wykluczone składniki: ${Array.isArray(preferences.excludedIngredients) ? preferences.excludedIngredients.join(', ') : 'Brak'}
      - Preferowane składniki: ${Array.isArray(preferences.preferredIngredients) ? preferences.preferredIngredients.join(', ') : 'Brak'}
      - Dostępny sprzęt kuchenny: ${Array.isArray(preferences.cookingEquipment) ? preferences.cookingEquipment.join(', ') : 'Standardowy sprzęt kuchenny'}
      ${preferences.specialRequirements ? `- Specjalne wymagania: ${preferences.specialRequirements}` : ''}
      
      ABSOLUTNIE KLUCZOWE: Wszystkie nazwy posiłków, składniki, instrukcje i opisy MUSZĄ być w języku polskim. Użyj tradycyjnych polskich nazw, polskich jednostek miary, i dostosuj przepisy do polskiej kuchni gdy to możliwe.
      `
      : `
      You are a professional nutritionist and meal planning expert tasked with creating a personalized meal plan for days ${generatedDays + 1} to ${generatedDays + currentBatchSize} of a ${requestedDays}-day plan.
      
      Create a comprehensive meal plan for EXACTLY ${currentBatchSize} days with these requirements:
      - Dietary type: ${preferences.dietaryType}
      - Daily calorie target: ${preferences.calorieTarget} calories
      - Meals per day: ${preferences.mealsPerDay}
      - Maximum cooking time per meal: ${preferences.maxCookingTime} minutes
      - Budget preference: ${preferences.budgetPreference}
      - Health goals: ${preferences.healthGoals?.join(', ') || 'Not specified'}
      - Cuisine preferences: ${preferences.cuisinePreferences?.join(', ') || 'Any'}
      - Cooking skill level: ${preferences.cookingSkillLevel || 'Intermediate'}
      
      IMPORTANT: Your response MUST include EXACTLY ${currentBatchSize} days in the meal plan. This is a critical requirement.
      
      Restrictions and preferences:
      - Allergies to avoid: ${preferences.allergies.join(', ') || 'None'}
      - Excluded ingredients: ${preferences.excludedIngredients.join(', ') || 'None'}
      - Preferred ingredients: ${preferences.preferredIngredients.join(', ') || 'None'}
      - Available cooking equipment: ${preferences.cookingEquipment?.join(', ') || 'Standard kitchen equipment'}
      ${preferences.specialRequirements ? `- Special requirements: ${preferences.specialRequirements}` : ''}
      
      ${preferences.weekdayVsWeekend === 'different' ? 
      '- Create different meal plans for weekdays vs weekends to accommodate varying schedules.' : 
      '- Keep a consistent structure throughout the week.'}
      
      ${generatedDays > 0 ? varietyConstraints : ''}
      
      ABSOLUTELY CRITICAL REQUIREMENT: EVERY DAY MUST HAVE COMPLETELY DIFFERENT MEALS:
      - Each breakfast across all days must be completely different from other days (never repeat breakfast types)
      - Each lunch across all days must be completely different from other days (never repeat lunch types)
      - Each dinner across all days must be completely different from other days (never repeat dinner types)
      - Use entirely different main protein sources for each meal (never repeat the same protein source)
      - Use different cooking methods for each meal (grill, bake, sauté, steam, stir-fry, etc.)
      - Include diverse cuisines across the meal plan (Italian, Mexican, Asian, Mediterranean, etc.)
      - Every meal name should be completely unique across the entire meal plan
      - Focus on creating unique combinations of ingredients - no variations of the same recipe
      - Create distinctive flavors and textures for each meal
      - Use food groups in creative combinations so no two days feel similar
      
      For EACH DAY provide:
      1. The date (starting from day ${generatedDays + 1})
      2. Day of the week
      3. A complete set of ${preferences.mealsPerDay} meals with:
         - Meal name (unique, descriptive and appetizing)
         - Meal type (breakfast, lunch, dinner, or snack)
         - Complete recipe with ingredients list
         - Step-by-step cooking instructions
         - Preparation time
         - Nutritional information (calories, protein, carbs, fat)
      4. Total daily calorie count
    
      Each recipe should be practical, achievable within the specified cooking time, and match the dietary preferences.
      
      VERIFICATION: Before finalizing the plan, check each day against all other days to ensure there is ZERO repetition of meal concepts. Every single meal across all days must be completely distinct. If you find any similarities, replace them with entirely different options.
      
      Please return the meal plan in a structured JSON format that's easy to parse programmatically.
      `;
  
    try {
      // Create a promise with a timeout to prevent hanging
      const timeoutDuration = 180000; // 3 minutes timeout for meal plan generation
      
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`API request timed out after ${timeoutDuration / 1000} seconds`));
        }, timeoutDuration);
      });
      
      // Używamy już wcześniej określonej zmiennej isPolish
      console.log(`Generating monthly meal plan batch in ${isPolish ? 'Polish' : 'English'} language`);
      
      // Create the actual API request promise
      const requestPromise = openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a nutrition and meal planning expert specializing in creating meal plans with ABSOLUTE MAXIMUM VARIETY. ${isPolish ? 'IMPORTANT: Create all meal plans, recipes, and instructions in Polish language with authentic Polish cuisine adaptations when appropriate.' : ''}
Follow these non-negotiable rules: 
1) Every single meal in the plan must be COMPLETELY DIFFERENT from all other meals in the entire plan - with ZERO repetition across days
2) Each day's breakfast must be entirely different from ALL other days' breakfasts
3) Each day's lunch must be entirely different from ALL other days' lunches
4) Each day's dinner must be entirely different from ALL other days' dinners
5) Never use the same main protein the same way twice in the entire plan
6) Use different cooking methods across meals
7) Incorporate many different global cuisines
8) Create specific, descriptive meal names that highlight key ingredients, cooking methods, or flavors
9) CRITICAL: If any two meals across different days are even somewhat similar, completely replace one with something totally different. The most essential requirement is that users MUST NOT see similar meals on different days
10) Your response must be in valid JSON format with a specific structure
11) IMPORTANT: Return your JSON response with a top-level key named "plan" containing the array of days
${isPolish ? '12) Include Polish traditional dishes when appropriate and use Polish measurement units and cooking terms, but keep the JSON structure in English (use "plan" as the key name, not "plan_posiłków")' : ''}`
          },
          { role: "user", content: prompt + "\n\nPlease respond in valid JSON format." }
        ],
        response_format: { type: "json_object" }
      });
      
      // Race the timeout against the actual request
      const response = await Promise.race([requestPromise, timeoutPromise]) as any;
  
      const content = response?.choices?.[0]?.message?.content || '{"plan":[]}';
      const parsedResponse = JSON.parse(content);
      
      console.log(`Raw OpenAI response for batch ${batch + 1}, structure:`, Object.keys(parsedResponse));
      
      // Process this batch's response
      let batchResult: any[] = [];
      
      // If response has a 'plan' key directly, use it
      if (Array.isArray(parsedResponse.plan)) {
        batchResult = parsedResponse.plan;
      }
      // If response has 'mealPlan' or 'meal_plan' and possibly 'weekendMealPlan' (different structure)
      else if (Array.isArray(parsedResponse.mealPlan)) {
        batchResult = parsedResponse.mealPlan;
        
        // If there's a separate weekend plan, append it
        if (Array.isArray(parsedResponse.weekendMealPlan)) {
          batchResult = [...batchResult, ...parsedResponse.weekendMealPlan];
        }
      }
      // Handle 'meal_plan' format (common in Polish responses)
      else if (parsedResponse.meal_plan) {
        console.log('Found meal_plan format in response');
        // Check if meal_plan is an array
        if (Array.isArray(parsedResponse.meal_plan)) {
          console.log('meal_plan is an array with length:', parsedResponse.meal_plan.length);
          batchResult = parsedResponse.meal_plan;
        }
        // Check if meal_plan has days inside it
        else if (parsedResponse.meal_plan.days && Array.isArray(parsedResponse.meal_plan.days)) {
          console.log('meal_plan.days is an array with length:', parsedResponse.meal_plan.days.length);
          batchResult = parsedResponse.meal_plan.days;
        }
        // If meal_plan is an object but not what we expect, try to adapt it
        else if (typeof parsedResponse.meal_plan === 'object') {
          console.log('meal_plan is an object with keys:', Object.keys(parsedResponse.meal_plan));
          
          // Try to transform the structure if it has daily plans
          // This handles the case where the structure might be like {day1: {...}, day2: {...}}
          let transformedDays = [];
          let dayKeys = Object.keys(parsedResponse.meal_plan).filter(key => 
            key.includes('day') || key.includes('dzień') || /^\d+$/.test(key));
            
          if (dayKeys.length > 0) {
            console.log('Found day-like keys in meal_plan:', dayKeys);
            dayKeys.forEach(dayKey => {
              const dayObj = parsedResponse.meal_plan[dayKey];
              if (dayObj && typeof dayObj === 'object') {
                // Convert to our expected format
                transformedDays.push({
                  dayOfWeek: dayObj.dayOfWeek || dayKey,
                  date: dayObj.date || new Date().toISOString().split('T')[0],
                  meals: dayObj.meals || [],
                  totalDailyCalories: dayObj.totalCalories || 0
                });
              }
            });
            
            if (transformedDays.length > 0) {
              console.log('Transformed meal_plan object into an array of days:', transformedDays.length);
              batchResult = transformedDays;
            }
          }
        }
      }
      // Handle 'plan_posiłków' format (Polish translation of "meal plan")
      else if (parsedResponse.plan_posiłków) {
        console.log('Found plan_posiłków format in response');
        
        // Check if plan_posiłków is an array
        if (Array.isArray(parsedResponse.plan_posiłków)) {
          console.log('plan_posiłków is an array with length:', parsedResponse.plan_posiłków.length);
          batchResult = parsedResponse.plan_posiłków;
        }
        // Check if it has days inside it
        else if (parsedResponse.plan_posiłków.dni && Array.isArray(parsedResponse.plan_posiłków.dni)) {
          console.log('plan_posiłków.dni is an array with length:', parsedResponse.plan_posiłków.dni.length);
          batchResult = parsedResponse.plan_posiłków.dni;
        }
        // If it's an object but not what we expect, try to adapt it
        else if (typeof parsedResponse.plan_posiłków === 'object') {
          console.log('plan_posiłków is an object with keys:', Object.keys(parsedResponse.plan_posiłków));
          
          // Try to transform the structure if it has daily plans
          let transformedDays = [];
          let dayKeys = Object.keys(parsedResponse.plan_posiłków).filter(key => 
            key.includes('day') || key.includes('dzień') || key.includes('dzien') || /^\d+$/.test(key));
            
          if (dayKeys.length > 0) {
            console.log('Found day-like keys in plan_posiłków:', dayKeys);
            dayKeys.forEach(dayKey => {
              const dayObj = parsedResponse.plan_posiłków[dayKey];
              if (dayObj && typeof dayObj === 'object') {
                // Convert to our expected format
                transformedDays.push({
                  dayOfWeek: dayObj.dayOfWeek || dayObj.dzieńTygodnia || dayKey,
                  date: dayObj.date || dayObj.data || new Date().toISOString().split('T')[0],
                  meals: dayObj.meals || dayObj.posiłki || [],
                  totalDailyCalories: dayObj.totalCalories || dayObj.całkowitaLiczbaKalorii || 0
                });
              }
            });
            
            if (transformedDays.length > 0) {
              console.log('Transformed plan_posiłków object into an array of days:', transformedDays.length);
              batchResult = transformedDays;
            }
          }
        }
      }
      // If the API returns a completely different structure, try to extract days from it
      else if (typeof parsedResponse === 'object') {
        console.log('Trying to extract data from unknown response structure with keys:', Object.keys(parsedResponse));
        
        // First, check for any Polish-named keys that might contain meal plans
        const possibleMealPlanKeys = ['plan_posiłków', 'plan_posikow', 'plan_posilkow', 'plan', 'plany'];
        for (const possibleKey of possibleMealPlanKeys) {
          if (parsedResponse[possibleKey]) {
            console.log(`Found possible meal plan key: ${possibleKey}`);
            
            if (Array.isArray(parsedResponse[possibleKey])) {
              console.log(`${possibleKey} is an array with ${parsedResponse[possibleKey].length} items`);
              batchResult = parsedResponse[possibleKey];
              break;
            } else if (typeof parsedResponse[possibleKey] === 'object') {
              // It might be a structured object, try to interpret it
              console.log(`${possibleKey} is an object with keys:`, Object.keys(parsedResponse[possibleKey]));
              
              // Maybe it has a days/dni property
              if (parsedResponse[possibleKey].days && Array.isArray(parsedResponse[possibleKey].days)) {
                batchResult = parsedResponse[possibleKey].days;
                break;
              } else if (parsedResponse[possibleKey].dni && Array.isArray(parsedResponse[possibleKey].dni)) {
                batchResult = parsedResponse[possibleKey].dni;
                break;
              }
            }
          }
        }
        
        // If we still don't have results, look for any array property that seems to contain days
        if (batchResult.length === 0) {
          for (const key in parsedResponse) {
            if (Array.isArray(parsedResponse[key]) && 
                parsedResponse[key].length > 0 &&
                parsedResponse[key][0] && 
                typeof parsedResponse[key][0] === 'object' &&
                (parsedResponse[key][0].meals || parsedResponse[key][0].posiłki || 
                 parsedResponse[key][0].date || parsedResponse[key][0].data)) {
              console.log(`Found array property that might contain days: ${key} with ${parsedResponse[key].length} items`);
              batchResult = [...batchResult, ...parsedResponse[key]];
            }
          }
        }
        
        // Last resort: if we have a structure we don't recognize, print it out
        if (batchResult.length === 0) {
          console.log('Could not find meal plan data in response structure. Full response:', parsedResponse);
        }
      }
      
      console.log(`Processed batch ${batch + 1}, got ${batchResult.length} days`);
      
      // Track the meal names for variety in future batches
      for (const day of batchResult) {
        if (day.meals && Array.isArray(day.meals)) {
          for (const meal of day.meals) {
            const mealType = meal.mealType ? meal.mealType.toLowerCase() : '';
            const mealName = meal.name || '';
            
            if (mealType === 'breakfast') usedBreakfastNames.push(mealName);
            else if (mealType === 'lunch') usedLunchNames.push(mealName);
            else if (mealType === 'dinner') usedDinnerNames.push(mealName);
          }
        }
      }
      
      // Add days to the result
      result.plan = [...result.plan, ...batchResult];
      generatedDays += batchResult.length;
      
      console.log(`Total progress: ${generatedDays}/${requestedDays} days generated`);
      
    } catch (error) {
      console.error(`Error generating batch ${batch + 1}:`, error);
      // Continue with the next batch rather than failing completely
    }
  }
  
  // Ensure result.plan exists and is an array
  if (!result.plan || !Array.isArray(result.plan)) {
    console.error('Invalid meal plan structure: plan is not an array', result);
    result.plan = [];
  }
  
  // Check for meal variety across all generated days
  if (result.plan.length > 1) {
    const varietyScore = assessMealPlanVariety(result.plan);
    console.log('Final meal plan variety score:', varietyScore);
    
    // If the variety score is too low and we have enough days, we can try to improve it
    if (varietyScore.overallVarietyScore < 0.6 && result.plan.length >= 3) {
      console.log('Low variety detected in meal plan - reordering days to maximize variety');
      result.plan = reorderDaysForMaximumVariety(result.plan);
    }
  }
  
  console.log('Processed OpenAI response:', {
    requestedDays,
    processedDays: result.plan.length
  });
  
  // Validate and normalize meal plan data before returning
  const normalizedPlan = result.plan.map(day => {
    // Convert meal object format to array format if needed
    // This handles the case where the API returns { breakfast: {...}, lunch: {...}, dinner: {...} }
    // instead of [ {...}, {...}, {...} ]
    if (!day.meals) {
      console.error('Invalid meal plan format: day.meals is missing', day);
      return { ...day, meals: [] };
    }
    
    let mealsArray = [];
    
    // If meals is not an array but an object with meal type keys, convert it
    if (!Array.isArray(day.meals) && typeof day.meals === 'object') {
      console.log('Converting meal plan from object to array format', Object.keys(day.meals));
      
      // Loop through potential meal type keys
      const mealTypeKeys = ['breakfast', 'lunch', 'dinner', 'snack', 'morningSnack', 'afternoonSnack', 'eveningSnack'];
      
      for (const mealType of mealTypeKeys) {
        if (day.meals[mealType]) {
          // Convert each meal object to our expected format
          mealsArray.push({
            name: day.meals[mealType].name || `Unknown ${mealType}`,
            mealType: mealType.toLowerCase(),
            recipe: {
              // Handle ingredients
              ingredients: (() => {
                const ingr = day.meals[mealType].ingredients || [];
                if (Array.isArray(ingr)) return ingr;
                if (typeof ingr === 'string') {
                  try {
                    return JSON.parse(ingr);
                  } catch {
                    return ingr.split('\n').filter(line => line.trim() !== '');
                  }
                }
                return [];
              })(),
              
              // Handle instructions
              instructions: (() => {
                const instr = day.meals[mealType].instructions || '';
                if (Array.isArray(instr)) return instr;
                if (typeof instr === 'string') {
                  try {
                    if (instr.startsWith('[') && instr.endsWith(']')) {
                      return JSON.parse(instr);
                    }
                    return instr.split('\n').filter(line => line.trim() !== '');
                  } catch {
                    return instr.split('\n').filter(line => line.trim() !== '');
                  }
                }
                return [];
              })(),
              
              // Default values for other properties
              prepTime: 30,
              nutritionInfo: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
              }
            }
          });
        }
      }
    } else if (Array.isArray(day.meals)) {
      // If it's already an array, use that
      mealsArray = day.meals;
    } else {
      console.error('Invalid meal plan format: day.meals is not an array or object', day);
      mealsArray = [];
    }
    
    // Process each meal in the array to ensure consistent format
    return {
      ...day,
      meals: mealsArray.map(meal => {
        // Ensure recipe object exists
        const recipe = meal.recipe || {};
        
        // Process ingredients
        let ingredients = recipe.ingredients || [];
        if (typeof ingredients === 'string') {
          try {
            ingredients = JSON.parse(ingredients);
          } catch (e) {
            // If parsing fails, split by newlines
            ingredients = ingredients.split('\n').filter(line => line.trim() !== '');
          }
        }
        
        // Process instructions
        let instructions = recipe.instructions || [];
        if (typeof instructions === 'string') {
          try {
            // Try to parse if it looks like JSON
            if (instructions.startsWith('[') && instructions.endsWith(']')) {
              instructions = JSON.parse(instructions);
            } else {
              // Otherwise split by newlines
              instructions = instructions.split('\n').filter(line => line.trim() !== '');
            }
          } catch (e) {
            // If parsing fails, split by newlines
            instructions = instructions.split('\n').filter(line => line.trim() !== '');
          }
        }
        
        // Ensure the recipe structure is consistent
        return {
          ...meal,
          recipe: {
            ...recipe,
            ingredients: Array.isArray(ingredients) ? ingredients : [],
            instructions: Array.isArray(instructions) ? instructions : [],
            nutritionInfo: recipe.nutritionInfo || {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0
            },
            prepTime: recipe.prepTime || 30
          }
        };
      })
    };
  });
  
  // Update the result with normalized data
  result.plan = normalizedPlan;
  
  return result;
}

/**
 * Assesses the variety of meals across different days in a meal plan
 * Checks for repetitive ingredients, meal types, and similar meal names
 */
function assessMealPlanVariety(plan: Array<any>): {
  overallVarietyScore: number;
  mealTypeRepetition: Record<string, number>;
  ingredientRepetition: Record<string, number>;
  cuisineVariety: number;
} {
  // Track meal types, main ingredients, and cuisine styles
  const breakfastTypes = new Set<string>();
  const lunchTypes = new Set<string>();
  const dinnerTypes = new Set<string>();
  const allIngredients: Record<string, number> = {};
  const mealNames = new Set<string>();
  
  // Count occurrences of meal types and ingredients
  const mealTypeCount: Record<string, number> = {};
  const mainIngredientsCount: Record<string, number> = {};
  
  // Track how many days have the same pattern
  let similarDaysCount = 0;
  
  // Process each day in the plan
  plan.forEach(day => {
    if (!day.meals || !Array.isArray(day.meals)) return;
    
    const daySignature: string[] = [];
    
    day.meals.forEach((meal: any) => {
      // Track meal names
      if (meal.name) {
        mealNames.add(meal.name.toLowerCase());
      }
      
      // Track meal types
      const mealType = meal.mealType?.toLowerCase() || 'other';
      mealTypeCount[mealType] = (mealTypeCount[mealType] || 0) + 1;
      daySignature.push(mealType);
      
      // Track meal patterns by type
      if (mealType.includes('breakfast')) {
        breakfastTypes.add(extractMealPattern(meal));
      } else if (mealType.includes('lunch')) {
        lunchTypes.add(extractMealPattern(meal));
      } else if (mealType.includes('dinner')) {
        dinnerTypes.add(extractMealPattern(meal));
      }
      
      // Track ingredients
      if (meal.recipe?.ingredients && Array.isArray(meal.recipe.ingredients)) {
        meal.recipe.ingredients.forEach((ingredient: string) => {
          // Extract main ingredient words (skip measurements, quantities)
          const mainIngredient = extractMainIngredient(ingredient);
          if (mainIngredient) {
            allIngredients[mainIngredient] = (allIngredients[mainIngredient] || 0) + 1;
            
            // Track only significant ingredients (proteins, main vegetables, grains)
            if (isSignificantIngredient(mainIngredient)) {
              mainIngredientsCount[mainIngredient] = (mainIngredientsCount[mainIngredient] || 0) + 1;
            }
          }
        });
      }
    });
    
    // Check if this day's signature (pattern of meal types) has been seen before
    const signature = daySignature.join('-');
    if (daySignature.length > 0) {
      similarDaysCount += 1;
    }
  });
  
  // Calculate variety metrics
  const uniqueBreakfastRatio = plan.length > 0 ? breakfastTypes.size / plan.length : 0;
  const uniqueLunchRatio = plan.length > 0 ? lunchTypes.size / plan.length : 0;
  const uniqueDinnerRatio = plan.length > 0 ? dinnerTypes.size / plan.length : 0;
  
  // Calculate ratio of unique meal names to total meals
  const totalMeals = plan.reduce((sum, day) => sum + (Array.isArray(day.meals) ? day.meals.length : 0), 0);
  const uniqueMealRatio = totalMeals > 0 ? mealNames.size / totalMeals : 0;
  
  // Calculate ingredient repetition score (lower is better)
  const ingredientRepetitionScore = Object.values(mainIngredientsCount)
    .filter(count => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);
  
  // Calculate overall variety score (0-1 scale, higher is better)
  const overallVarietyScore = (
    uniqueBreakfastRatio * 0.3 +
    uniqueLunchRatio * 0.3 +
    uniqueDinnerRatio * 0.3 + 
    uniqueMealRatio * 0.1
  );
  
  return {
    overallVarietyScore,
    mealTypeRepetition: mealTypeCount,
    ingredientRepetition: mainIngredientsCount,
    cuisineVariety: mealNames.size
  };
}

/**
 * Extract the main ingredient from an ingredient string
 * e.g. "2 tbsp olive oil" -> "olive oil", "1 cup brown rice" -> "rice"
 */
function extractMainIngredient(ingredient: string): string {
  // Remove quantities and measurements
  const withoutMeasurements = ingredient.replace(/^[\d\s\/]+\s*(tbsp|tsp|cup|oz|g|kg|ml|l|pound|lb|pinch|dash|handful)\s+/i, '');
  
  // Normalize the ingredient text
  return withoutMeasurements.toLowerCase().trim();
}

/**
 * Extract a signature pattern for a meal to identify similar meals
 */
function extractMealPattern(meal: any): string {
  if (!meal) return 'unknown';
  
  // Get main ingredients if available
  let mainIngredients = '';
  if (meal.recipe?.ingredients && Array.isArray(meal.recipe.ingredients)) {
    // Take the first 2-3 main ingredients
    const significantIngredients = meal.recipe.ingredients
      .map(extractMainIngredient)
      .filter(isSignificantIngredient)
      .slice(0, 3);
    
    mainIngredients = significantIngredients.join('-');
  }
  
  // Use the meal name if it's available
  const mealName = meal.name ? meal.name.toLowerCase() : '';
  
  // Generate a signature combining name and ingredients
  return `${mealName}-${mainIngredients}`;
}

/**
 * Check if an ingredient is significant for determining meal variety
 * (proteins, main vegetables, grains, etc.)
 */
function isSignificantIngredient(ingredient: string): boolean {
  // Skip minor ingredients and condiments
  const minorIngredients = [
    'salt', 'pepper', 'oil', 'water', 'garlic', 'onion', 'spice', 'herb',
    'powder', 'sauce', 'seasoning', 'vinegar', 'lemon', 'lime'
  ];
  
  for (const minor of minorIngredients) {
    if (ingredient.includes(minor)) return false;
  }
  
  return true;
}

/**
 * Reorder the days in a meal plan to maximize variety between adjacent days
 */
function reorderDaysForMaximumVariety(plan: Array<any>): Array<any> {
  // If we have fewer than 2 days, no reordering needed
  if (!plan || plan.length <= 2) return plan;
  
  // Create a copy of the plan to reorder
  const reorderedPlan = [...plan];
  
  // Start with the first day
  const finalOrder = [reorderedPlan[0]];
  reorderedPlan.splice(0, 1);
  
  // While we have days left to place
  while (reorderedPlan.length > 0) {
    // Find the most different day from the last added day
    const lastDay = finalOrder[finalOrder.length - 1];
    
    let mostDifferentDayIndex = 0;
    let highestDifferenceScore = -1;
    
    // Calculate difference scores for each remaining day
    reorderedPlan.forEach((day, index) => {
      const differenceScore = calculateDayDifference(lastDay, day);
      if (differenceScore > highestDifferenceScore) {
        highestDifferenceScore = differenceScore;
        mostDifferentDayIndex = index;
      }
    });
    
    // Add the most different day to our final order
    finalOrder.push(reorderedPlan[mostDifferentDayIndex]);
    reorderedPlan.splice(mostDifferentDayIndex, 1);
  }
  
  // Preserve original dates in the reordered plan
  for (let i = 0; i < plan.length; i++) {
    if (plan[i].date && finalOrder[i]) {
      finalOrder[i].date = plan[i].date;
    }
    if (plan[i].dayOfWeek && finalOrder[i]) {
      finalOrder[i].dayOfWeek = plan[i].dayOfWeek;
    }
  }
  
  return finalOrder;
}

/**
 * Calculate how different two days in the meal plan are
 * Higher score means more different
 */
function calculateDayDifference(day1: any, day2: any): number {
  if (!day1.meals || !day2.meals || !Array.isArray(day1.meals) || !Array.isArray(day2.meals)) {
    return 0;
  }
  
  // Start with a base difference score
  let differenceScore = 0;
  
  // Compare each meal by type
  const day1MealsByType: Record<string, any> = {};
  const day2MealsByType: Record<string, any> = {};
  
  // Group meals by type
  day1.meals.forEach((meal: any) => {
    const type = meal.mealType?.toLowerCase() || 'other';
    day1MealsByType[type] = meal;
  });
  
  day2.meals.forEach((meal: any) => {
    const type = meal.mealType?.toLowerCase() || 'other';
    day2MealsByType[type] = meal;
  });
  
  // Compare meals of the same type between days
  for (const mealType in day1MealsByType) {
    if (day2MealsByType[mealType]) {
      const meal1 = day1MealsByType[mealType];
      const meal2 = day2MealsByType[mealType];
      
      // Different meal names
      if (meal1.name && meal2.name && meal1.name !== meal2.name) {
        differenceScore += 0.5;
      }
      
      // Compare ingredients if available
      if (meal1.recipe?.ingredients && meal2.recipe?.ingredients) {
        const ingredients1 = new Set(meal1.recipe.ingredients.map(extractMainIngredient));
        const ingredients2 = new Set(meal2.recipe.ingredients.map(extractMainIngredient));
        
        // Count unique ingredients in each meal
        let commonCount = 0;
        // Convert Set to Array for iteration
        Array.from(ingredients1).forEach(ing => {
          if (ingredients2.has(ing)) commonCount++;
        });
        
        // More different ingredients = higher score
        const uniqueRatio = 1 - (commonCount / Math.max(ingredients1.size, ingredients2.size, 1));
        differenceScore += uniqueRatio * 0.5;
      }
    } else {
      // Meal type exists in one day but not the other
      differenceScore += 1;
    }
  }
  
  return differenceScore;
}

// Recipe suggestions
export async function suggestRecipe(ingredients: string[]): Promise<{
  name: string;
  ingredients: string[];
  instructions: string[];
  nutritionInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a culinary expert. When suggesting recipes, create descriptive and appetizing names that highlight the key flavors, cooking methods, or main ingredients. For example, use names like 'Zesty Lemon Herb Roasted Chicken' or 'Creamy Garlic Parmesan Pasta' instead of generic names like 'Chicken Recipe' or 'Pasta Dish'. Suggest a recipe using the provided ingredients and include nutritional information. For instructions, write flowing paragraphs that start with action verbs and equipment needed, like 'Heat a large skillet over medium heat.' or 'Take a mixing bowl and combine the flour, sugar, and eggs.' Group related actions together in logical sequence."
      },
      {
        role: "user",
        content: `Suggest a recipe using some or all of these ingredients: ${ingredients.join(', ')}. 
        
IMPORTANT INSTRUCTION FORMAT: Write cooking instructions as coherent paragraphs that:
1. Begin with the equipment/tools needed ("Take a large bowl...", "Heat a pan...")
2. Use action verbs at the start of sentences
3. Group related steps together logically
4. Include timing and visual cues
5. Avoid numbered/bulleted lists that separate related actions
        
Include complete recipe details and nutritional information.`
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || '{"name":"Simple Recipe","ingredients":[],"instructions":[],"nutritionInfo":{"calories":0,"protein":0,"carbs":0,"fat":0}}';
  return JSON.parse(content);
}