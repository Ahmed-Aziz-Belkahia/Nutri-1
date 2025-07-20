// Optimized meal generator - balances speed (under 20 seconds) with accuracy
// Uses GPT-4o-mini for fast personalization while maintaining quality

import OpenAI from "openai";
import { generateFastPersonalizedMealPlan } from './fast-meal-generator';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MealPlanPreferences {
  dietaryType: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies?: string[];
  excludedIngredients?: string[];
  maxCookingTime?: number;
  budgetPreference?: string;
  preferredIngredients?: string[];
  healthGoals?: string[];
  cuisinePreferences?: string[];
  cookingSkillLevel?: string;
  language?: string;
}

interface OptimizedMealResult {
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
}

// Smart routing: Use templates for standard cases, AI for complex customization
export async function generateOptimizedMealPlan(
  preferences: MealPlanPreferences, 
  days: number = 1
): Promise<{
  plan: Array<{
    date: string;
    meals: OptimizedMealResult[];
    totalCalories: number;
  }>;
  totalCost: number;
  generationMethod: 'template' | 'ai-mini' | 'hybrid';
}> {
  
  const startTime = Date.now();
  console.log('🚀 Starting optimized meal plan generation...');
  
  // Determine best generation method based on complexity
  const complexityScore = calculateComplexityScore(preferences);
  console.log(`📊 Complexity score: ${complexityScore}/10`);
  
  let result;
  let method: 'template' | 'ai-mini' | 'hybrid';
  
  if (complexityScore <= 3) {
    // Simple case: Use fast templates (unless dietary restrictions require AI)
    console.log('⚡ Using FAST template generation...');
    method = 'template';
    try {
      result = await generateFastPersonalizedMealPlan(preferences, days);
    } catch (error: any) {
      if (error.message === 'DIETARY_COMPLIANCE_REQUIRED') {
        console.log('🌱 Dietary restrictions detected - switching to AI generation');
        method = 'ai-mini';
        result = await generateAIMealPlanFast(preferences, days);
      } else {
        throw error;
      }
    }
  } else if (complexityScore <= 7) {
    // Medium complexity: Use hybrid approach
    console.log('🔧 Using HYBRID generation (templates + AI enhancement)...');
    method = 'hybrid';
    result = await generateHybridMealPlan(preferences, days);
  } else {
    // High complexity: Use fast AI (GPT-4o-mini)
    console.log('🤖 Using FAST AI generation (GPT-4o-mini)...');
    method = 'ai-mini';
    result = await generateAIMealPlanFast(preferences, days);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  console.log(`✅ Meal plan generated in ${duration.toFixed(2)} seconds using ${method} method`);
  
  return {
    ...result,
    generationMethod: method
  };
}

// Calculate complexity score to determine best generation method
function calculateComplexityScore(preferences: MealPlanPreferences): number {
  let score = 0;
  
  // Dietary restrictions ALWAYS need AI for accuracy - force high complexity
  if (preferences.dietaryType === 'vegetarian' || preferences.dietaryType === 'vegan') {
    score += 8; // Force AI generation for dietary compliance
    console.log('🌱 Vegetarian/vegan diet detected - forcing AI generation for accuracy');
  } else if (preferences.dietaryType === 'tylko mięso' || preferences.dietaryType === 'meat-only' || preferences.dietaryType === 'carnivore') {
    score += 8; // Force AI generation for meat-only dietary compliance
    console.log('🥩 Meat-only diet detected - forcing AI generation for accuracy');
  }
  
  // Other dietary restrictions add complexity
  if (preferences.dietaryType !== 'omnivore' && preferences.dietaryType !== 'balanced' && 
      preferences.dietaryType !== 'vegetarian' && preferences.dietaryType !== 'vegan' &&
      preferences.dietaryType !== 'tylko mięso' && preferences.dietaryType !== 'meat-only' && preferences.dietaryType !== 'carnivore') {
    score += 2;
  }
  
  // Allergies and exclusions add complexity
  if (preferences.allergies && preferences.allergies.length > 0) {
    score += preferences.allergies.length;
  }
  if (preferences.excludedIngredients && preferences.excludedIngredients.length > 0) {
    score += preferences.excludedIngredients.length * 0.5;
  }
  
  // Specific cuisine preferences add complexity
  if (preferences.cuisinePreferences && preferences.cuisinePreferences.length > 0) {
    score += preferences.cuisinePreferences.length;
  }
  
  // Health goals add complexity
  if (preferences.healthGoals && preferences.healthGoals.length > 0) {
    score += preferences.healthGoals.length * 0.5;
  }
  
  // Very low or high calorie targets add complexity
  if (preferences.calorieTarget < 1500 || preferences.calorieTarget > 3000) {
    score += 1;
  }
  
  // Strict time constraints add complexity
  if (preferences.maxCookingTime && preferences.maxCookingTime < 20) {
    score += 2;
  }
  
  return Math.min(score, 10); // Cap at 10
}

// Hybrid generation: Fast templates enhanced with AI personalization
async function generateHybridMealPlan(
  preferences: MealPlanPreferences, 
  days: number
): Promise<{
  plan: Array<{
    date: string;
    meals: OptimizedMealResult[];
    totalCalories: number;
  }>;
  totalCost: number;
}> {
  
  // Start with fast template generation
  const templateResult = await generateFastPersonalizedMealPlan(preferences, days);
  
  // Enhance with AI personalization for specific preferences
  const enhancedPlans = await Promise.all(
    templateResult.plan.map(async (dayPlan, index) => {
      const enhancedMeals = await enhanceMealsWithAI(dayPlan.meals, preferences);
      
      return {
        date: `Day ${index + 1}`,
        meals: enhancedMeals,
        totalCalories: enhancedMeals.reduce((sum, meal) => sum + meal.recipe.nutritionInfo.calories, 0)
      };
    })
  );
  
  return {
    plan: enhancedPlans,
    totalCost: templateResult.totalCost
  };
}

// Fast AI generation using GPT-4o-mini (much faster than GPT-4o)
async function generateAIMealPlanFast(
  preferences: MealPlanPreferences, 
  days: number
): Promise<{
  plan: Array<{
    date: string;
    meals: OptimizedMealResult[];
    totalCalories: number;
  }>;
  totalCost: number;
}> {
  
  const isPolish = preferences.language === 'pl';
  
  try {
    // Use GPT-4o-mini for much faster generation (3-5 seconds vs 20-40 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Much faster than gpt-4o
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert creating personalized meal plans. ${isPolish ? 'Twórz plany posiłków w języku polskim.' : 'Create meal plans in English.'} 

CRITICAL DIETARY COMPLIANCE:
- VEGETARIAN: NO meat, poultry, fish, seafood, or animal-derived broths. Include dairy and eggs if not excluded.
- VEGAN: NO animal products whatsoever - no meat, dairy, eggs, honey, gelatin.
- MEAT-ONLY/TYLKO MIĘSO/CARNIVORE: ONLY animal products - meat, poultry, fish, eggs, dairy. NO vegetables, fruits, grains, legumes, or plant foods.
- LACTOSE-FREE: NO dairy products - no milk, cheese, butter, cream, yogurt.
- Always check ingredients lists for hidden restricted items.

Focus on:
- Speed: Generate practical, realistic meals quickly
- Accuracy: Respect dietary restrictions and preferences exactly - this is NON-NEGOTIABLE
- Variety: Ensure different meals across days
- Nutrition: Meet calorie and macro targets

Return JSON format with this structure:
{
  "plan": [
    {
      "date": "Day 1",
      "meals": [
        {
          "name": "Meal name",
          "mealType": "breakfast|lunch|dinner",
          "recipe": {
            "ingredients": ["ingredient1", "ingredient2"],
            "instructions": ["step1", "step2"],
            "prepTime": 15,
            "nutritionInfo": {
              "calories": 400,
              "protein": 25,
              "carbs": 30,
              "fat": 15
            }
          }
        }
      ]
    }
  ]
}`
        },
        {
          role: "user",
          content: `Create a ${days}-day meal plan with these requirements:

DIETARY TYPE: ${preferences.dietaryType}
${preferences.dietaryType === 'vegetarian' ? '⚠️ ABSOLUTELY NO MEAT, POULTRY, FISH, OR SEAFOOD. Only plant-based proteins, dairy, and eggs allowed.' : ''}
${preferences.dietaryType === 'vegan' ? '⚠️ ABSOLUTELY NO ANIMAL PRODUCTS. No meat, dairy, eggs, honey, or animal-derived ingredients.' : ''}
${(preferences.dietaryType === 'tylko mięso' || preferences.dietaryType === 'meat-only' || preferences.dietaryType === 'carnivore') ? '⚠️ ONLY ANIMAL PRODUCTS. No vegetables, fruits, grains, legumes, or plant foods. Focus on meat, poultry, fish, eggs, and dairy only.' : ''}

- Daily calories: ${preferences.calorieTarget} (distribute evenly across ${preferences.mealsPerDay} meals = ~${Math.round(preferences.calorieTarget / preferences.mealsPerDay)} calories per meal)
- Meals per day: ${preferences.mealsPerDay}
- Max cooking time: ${preferences.maxCookingTime || 30} minutes
- Allergies: ${preferences.allergies?.join(', ') || 'none'}
- Excluded ingredients: ${preferences.excludedIngredients?.join(', ') || 'none'}
- Preferred ingredients: ${preferences.preferredIngredients?.join(', ') || 'none'}
- Cuisine preferences: ${preferences.cuisinePreferences?.join(', ') || 'any'}
- Health goals: ${preferences.healthGoals?.join(', ') || 'general health'}

VERIFICATION CHECKLIST:
✓ All meals respect the ${preferences.dietaryType} dietary requirement
✓ No excluded ingredients are used
✓ All allergies are avoided
✓ Cooking time stays under ${preferences.maxCookingTime || 30} minutes per meal

Generate practical, delicious meals that meet these requirements exactly.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from AI');
    }

    const parsedResult = JSON.parse(content);
    
    // Validate and transform the result
    const validatedPlan = parsedResult.plan.map((dayPlan: any, index: number) => ({
      date: `Day ${index + 1}`,
      meals: dayPlan.meals.map((meal: any) => ({
        name: meal.name,
        mealType: meal.mealType,
        recipe: {
          ingredients: Array.isArray(meal.recipe.ingredients) ? meal.recipe.ingredients : [],
          instructions: Array.isArray(meal.recipe.instructions) ? meal.recipe.instructions : [],
          prepTime: meal.recipe.prepTime || 20,
          nutritionInfo: {
            calories: meal.recipe.nutritionInfo?.calories || 300,
            protein: meal.recipe.nutritionInfo?.protein || 15,
            carbs: meal.recipe.nutritionInfo?.carbs || 30,
            fat: meal.recipe.nutritionInfo?.fat || 10
          }
        }
      })),
      totalCalories: dayPlan.meals.reduce((sum: number, meal: any) => 
        sum + (meal.recipe?.nutritionInfo?.calories || 300), 0
      )
    }));

    return {
      plan: validatedPlan,
      totalCost: 0
    };
    
  } catch (error) {
    console.error('Fast AI generation failed, falling back to templates:', error);
    // Fallback to fast templates if AI fails
    return await generateFastPersonalizedMealPlan(preferences, days);
  }
}

// Enhance template meals with AI personalization
async function enhanceMealsWithAI(
  meals: any[], 
  preferences: MealPlanPreferences
): Promise<OptimizedMealResult[]> {
  
  // For hybrid mode, we only enhance if there are specific preferences
  const needsEnhancement = (
    preferences.cuisinePreferences?.length || 
    preferences.healthGoals?.length ||
    preferences.preferredIngredients?.length
  );
  
  if (!needsEnhancement) {
    return meals; // Return templates as-is if no specific enhancements needed
  }
  
  try {
    const isPolish = preferences.language === 'pl';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Fast enhancement timeout
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast model for enhancements
      messages: [
        {
          role: "system",
          content: `Enhance these meal suggestions based on user preferences. ${isPolish ? 'Odpowiadaj w języku polskim.' : 'Respond in English.'} Keep the same meal types and approximate calories, but adjust ingredients and preparation to match preferences better.`
        },
        {
          role: "user",
          content: `Enhance these meals:
${meals.map(meal => `- ${meal.name} (${meal.mealType})`).join('\n')}

User preferences:
- Cuisine: ${preferences.cuisinePreferences?.join(', ') || 'any'}
- Health goals: ${preferences.healthGoals?.join(', ') || 'general health'}
- Preferred ingredients: ${preferences.preferredIngredients?.join(', ') || 'none'}
- Excluded: ${preferences.excludedIngredients?.join(', ') || 'none'}

Return JSON with enhanced meals keeping same structure.`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    }, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const content = response.choices[0].message.content;
    if (content) {
      const enhanced = JSON.parse(content);
      return enhanced.meals || meals; // Use enhanced if valid, otherwise original
    }
  } catch (error) {
    console.log('Enhancement failed, using original meals:', error);
  }
  
  return meals; // Return original meals if enhancement fails
}