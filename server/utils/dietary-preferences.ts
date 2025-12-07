/**
 * Dietary Preferences Helper
 * 
 * Centralized module for fetching and formatting user dietary preferences
 * to be used across all AI functions for consistent behavior.
 */

import { db } from "@db";
import { userNutritionPreferences } from "@db/schema";
import { eq } from "drizzle-orm";

export interface UserDietaryPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  mealBudget?: string;
  experienceLevel?: string;
  healthGoals?: string[];
  // Computed fields
  hasRestrictions: boolean;
  hasAllergies: boolean;
}

/**
 * Fetch user's dietary preferences from the database
 */
export async function getUserDietaryPreferences(userId: number): Promise<UserDietaryPreferences> {
  try {
    const userPrefs = await db.query.userNutritionPreferences.findFirst({
      where: eq(userNutritionPreferences.userId, userId)
    });

    const dietaryRestrictions = userPrefs?.dietaryRestrictions || [];
    const allergies = userPrefs?.allergies || [];

    return {
      dietaryRestrictions,
      allergies,
      mealBudget: userPrefs?.mealBudget || undefined,
      experienceLevel: userPrefs?.experienceLevel || undefined,
      healthGoals: [], // Can be extended if we add this field to schema
      hasRestrictions: dietaryRestrictions.length > 0,
      hasAllergies: allergies.length > 0
    };
  } catch (error) {
    console.error('[DietaryPreferences] Error fetching user preferences:', error);
    return {
      dietaryRestrictions: [],
      allergies: [],
      hasRestrictions: false,
      hasAllergies: false
    };
  }
}

/**
 * Generate system prompt additions for dietary preferences
 * This should be added to any AI prompt that generates food-related content
 */
export function generateDietaryPromptAdditions(prefs: UserDietaryPreferences): string {
  let additions = '';

  if (prefs.hasAllergies) {
    additions += `
CRITICAL SAFETY REQUIREMENT - FOOD ALLERGIES:
The user has the following food allergies: ${prefs.allergies.join(', ')}
You MUST NOT include any ingredients that contain or may contain these allergens.
This is a health and safety requirement - allergic reactions can be life-threatening.
Always check for hidden allergens in sauces, seasonings, and processed ingredients.
`;
  }

  if (prefs.hasRestrictions) {
    additions += `
DIETARY RESTRICTIONS:
The user follows these dietary restrictions: ${prefs.dietaryRestrictions.join(', ')}
Ensure all recipes and food suggestions comply with these dietary requirements.
`;
  }

  if (prefs.experienceLevel) {
    additions += `
COOKING EXPERIENCE:
The user's cooking experience level is: ${prefs.experienceLevel}
${prefs.experienceLevel === 'beginner' ? 'Keep recipes simple with basic techniques and common ingredients.' : ''}
${prefs.experienceLevel === 'intermediate' ? 'Include moderate complexity recipes with some advanced techniques.' : ''}
${prefs.experienceLevel === 'advanced' ? 'Feel free to include complex techniques and sophisticated recipes.' : ''}
`;
  }

  if (prefs.mealBudget) {
    additions += `
BUDGET PREFERENCE:
The user's meal budget preference is: ${prefs.mealBudget}
${prefs.mealBudget === 'low' ? 'Focus on affordable, budget-friendly ingredients.' : ''}
${prefs.mealBudget === 'medium' ? 'Balance between quality and affordability.' : ''}
${prefs.mealBudget === 'high' ? 'Can include premium ingredients and specialty items.' : ''}
`;
  }

  return additions;
}

/**
 * Generate user prompt additions for dietary preferences
 * This should be added to user prompts for reinforcement
 */
export function generateDietaryUserPromptAdditions(prefs: UserDietaryPreferences): string {
  let additions = '';

  if (prefs.hasAllergies) {
    additions += `\n⚠️ ALLERGY ALERT: Avoid ALL of these allergens: ${prefs.allergies.join(', ')}`;
  }

  if (prefs.hasRestrictions) {
    additions += `\n📋 DIETARY RESTRICTIONS: Follow these restrictions: ${prefs.dietaryRestrictions.join(', ')}`;
  }

  return additions;
}

/**
 * Filter ingredients list to remove allergens
 * Useful for template-based meal generation
 */
export function filterIngredientsForAllergies(ingredients: string[], allergies: string[]): string[] {
  if (!allergies || allergies.length === 0) return ingredients;

  const allergyLowercase = allergies.map(a => a.toLowerCase());
  
  return ingredients.filter(ingredient => {
    const ingredientLower = ingredient.toLowerCase();
    return !allergyLowercase.some(allergy => 
      ingredientLower.includes(allergy) ||
      isAllergenRelated(ingredientLower, allergy)
    );
  });
}

/**
 * Check if an ingredient is related to an allergen
 * Handles common allergen variants
 */
function isAllergenRelated(ingredient: string, allergen: string): boolean {
  const allergenMap: Record<string, string[]> = {
    'nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'peanut'],
    'peanuts': ['peanut', 'groundnut'],
    'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose', 'ghee'],
    'milk': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose'],
    'eggs': ['egg', 'mayonnaise', 'meringue', 'albumin'],
    'gluten': ['wheat', 'barley', 'rye', 'flour', 'bread', 'pasta', 'cereal', 'semolina'],
    'wheat': ['wheat', 'flour', 'bread', 'pasta', 'couscous', 'bulgur', 'semolina'],
    'soy': ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'soy sauce'],
    'fish': ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'anchovies', 'sardines', 'mackerel'],
    'shellfish': ['shrimp', 'crab', 'lobster', 'oyster', 'clam', 'mussel', 'scallop', 'prawn'],
    'sesame': ['sesame', 'tahini'],
    'sulfites': ['wine', 'dried fruit', 'pickles']
  };

  const relatedIngredients = allergenMap[allergen.toLowerCase()] || [];
  return relatedIngredients.some(related => ingredient.includes(related));
}

/**
 * Validate that a meal plan respects dietary preferences
 * Returns list of violations if any
 */
export function validateMealPlanForPreferences(
  meals: Array<{ name: string; ingredients?: string[] }>,
  prefs: UserDietaryPreferences
): string[] {
  const violations: string[] = [];

  if (!prefs.hasAllergies && !prefs.hasRestrictions) return violations;

  for (const meal of meals) {
    if (meal.ingredients) {
      for (const ingredient of meal.ingredients) {
        const ingredientLower = ingredient.toLowerCase();
        
        // Check allergies
        for (const allergy of prefs.allergies) {
          if (ingredientLower.includes(allergy.toLowerCase()) || 
              isAllergenRelated(ingredientLower, allergy)) {
            violations.push(`Meal "${meal.name}" contains allergen: ${allergy} (in ${ingredient})`);
          }
        }
      }
    }
  }

  return violations;
}
