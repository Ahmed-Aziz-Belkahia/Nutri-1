import OpenAI from 'openai';
import { z } from 'zod';
import { trackOpenAIUsage, trackFailedRequest } from '../utils/token-tracker';
import { makeVisionRequest, makeAIRequest, AI_MODELS } from './ai-service-manager';
import { db } from '@db';
import { userNutritionPreferences } from '@db/schema';
import { eq } from 'drizzle-orm';

// Language mapping for AI responses
const languageNames: Record<string, string> = {
  'en': 'English',
  'fr': 'French',
  'pl': 'Polish',
  'es': 'Spanish',
  'ar': 'Arabic'
};

// Build language instruction for AI prompts
function buildLanguageInstruction(languageCode?: string): string {
  if (!languageCode || languageCode === 'en') return '';
  const languageName = languageNames[languageCode] || 'English';
  return `\n\nLANGUAGE REQUIREMENT: Return ALL text values (food names, descriptions, ingredients, instructions, component names, cuisine types, tags, dietary flags) in ${languageName}. Keep all JSON keys in English - only translate the VALUES.`;
}

// Dietary preferences interface
interface UserDietaryProfile {
  allergies?: string;
  dietaryRestrictions?: string;
  mealBudget?: string;
  experienceLevel?: string;
}

// Get user's dietary preferences from database
async function getUserDietaryProfile(userId: number): Promise<UserDietaryProfile | null> {
  try {
    const prefs = await db
      .select()
      .from(userNutritionPreferences)
      .where(eq(userNutritionPreferences.userId, userId))
      .limit(1);
    
    if (!prefs[0]) return null;
    
    return {
      allergies: Array.isArray(prefs[0].allergies) ? prefs[0].allergies.join(', ') : (prefs[0].allergies || ''),
      dietaryRestrictions: Array.isArray(prefs[0].dietaryRestrictions) ? prefs[0].dietaryRestrictions.join(', ') : (prefs[0].dietaryRestrictions || ''),
      mealBudget: prefs[0].mealBudget || '',
      experienceLevel: prefs[0].experienceLevel || ''
    };
  } catch (error) {
    console.error('[Food Recognition] Error fetching dietary profile:', error);
    return null;
  }
}

// Build dietary warning prompts
function buildDietaryWarnings(profile: UserDietaryProfile | null): string {
  if (!profile) return '';
  
  const warnings: string[] = [];
  
  if (profile.allergies?.trim()) {
    warnings.push(`\n⚠️ ALLERGEN ALERT: User is allergic to: ${profile.allergies}`);
    warnings.push('If any identified food may contain these allergens, add "allergenWarning": true to the response.');
  }
  
  if (profile.dietaryRestrictions?.trim()) {
    warnings.push(`\nDietary Restrictions: ${profile.dietaryRestrictions}`);
    warnings.push('Flag any foods that may violate these restrictions.');
  }
  
  return warnings.join('\n');
}

// Define ingredient schema for recipe fields
const IngredientItemSchema = z.object({
  name: z.string(),
  quantity: z.union([z.number(), z.string()]),
  unit: z.string(),
  calories: z.number().optional(),
});

// Define component schema with strict validation
const FoodComponentSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  servingSize: z.string(),
  quantity: z.number(),
  details: z.object({
    type: z.string(),
    preparation: z.string(),
    texture: z.string(),
    color: z.string(),
    estimatedWeight: z.string(),
    cookingMethod: z.string().optional(),
    doneness: z.string().optional(),
    temperature: z.string().optional(),
    accompaniments: z.array(z.string()).optional(),
    sauce: z.string().optional().nullable(),
    seasonings: z.array(z.string()).optional(),
    garnishes: z.array(z.string()).optional(),
    presentation: z.string().optional()
  }).passthrough(),
});

// Enhanced schema with recipe fields and safety flags
const FoodAnalysisSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  confidence: z.number(),
  servingSize: z.string().optional(),
  components: z.array(FoodComponentSchema).default([]),
  
  // Recipe fields (optional)
  description: z.string().optional().nullable(),
  ingredients: z.array(IngredientItemSchema).optional().nullable(),
  instructions: z.array(z.string()).optional().nullable(),
  prepTime: z.number().optional().nullable(),
  cookTime: z.number().optional().nullable(),
  servings: z.number().optional().nullable(),
  cuisineType: z.string().optional().nullable(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  
  // Safety and dietary flags
  allergenWarning: z.boolean().optional(),
  potentialAllergens: z.array(z.string()).optional(),
  dietaryFlags: z.array(z.string()).optional(), // e.g., ['contains-dairy', 'high-sodium']
  healthScore: z.number().min(1).max(10).optional(), // 1-10 health rating
}).strict();

export type FoodAnalysis = z.infer<typeof FoodAnalysisSchema>;

async function analyzeWithOpenAI(imageBase64: string, format: string = 'jpeg', userId?: number, dietaryProfile?: UserDietaryProfile | null, language?: string): Promise<FoodAnalysis> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Food Recognition] OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log(`[Food Recognition] Starting image analysis with format: ${format}, language: ${language || 'en'}...`);
    
    // Build dietary warnings if user has dietary restrictions
    const dietaryWarnings = buildDietaryWarnings(dietaryProfile || null);
    
    // Build language instruction for localized response
    const languageInstruction = buildLanguageInstruction(language);

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a precise food analysis system that ALWAYS breaks down food products into separate components with detailed information. Additionally, you identify recognizable recipes and generate cooking instructions. Respond with structured JSON data.

KEY ACCURACY GUIDELINES:
1. Be conservative with calorie estimates - use USDA database standards
2. Consider visible portion sizes carefully - don't overestimate
3. Account for cooking methods (fried adds fat, grilled is leaner)
4. Identify hidden calories (sauces, oils, butter)
5. Rate your confidence honestly based on image clarity and food visibility
${dietaryWarnings}${languageInstruction}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this food image and return a detailed analysis as a JSON object with exactly this structure:
{
  "name": "General meal description in English",
  "calories": sum_of_all_component_calories,
  "protein": sum_of_all_component_protein,
  "carbs": sum_of_all_component_carbs,
  "fat": sum_of_all_component_fat,
  "confidence": number_between_0_and_1,
  "components": [
    {
      "name": "Specific component name",
      "calories": component_calories,
      "protein": grams_of_protein,
      "carbs": grams_of_carbs,
      "fat": grams_of_fat,
      "servingSize": "Precise measurement",
      "quantity": number_of_units,
      "details": {
        "type": "Food category",
        "preparation": "Preparation method",
        "texture": "Texture description",
        "color": "Color description",
        "estimatedWeight": "Weight in grams"
      }
    }
  ],
  "description": "Detailed dish description (optional)",
  "ingredients": [
    {
      "name": "Ingredient",
      "quantity": number,
      "unit": "unit of measurement",
      "calories": calories_optional
    }
  ],
  "instructions": [
    "Preparation step 1",
    "Preparation step 2"
  ],
  "prepTime": preparation_time_in_minutes,
  "cookTime": cooking_time_in_minutes,
  "servings": number_of_servings,
  "cuisineType": "Cuisine type (e.g., 'Polish', 'Italian', 'Asian')",
  "mealType": "Meal type ('breakfast', 'lunch', 'dinner', 'snack')",
  "difficulty": "Difficulty level ('easy', 'medium', 'hard')",
  "tags": ["tag1", "tag2"],
  "allergenWarning": true_if_common_allergens_detected,
  "potentialAllergens": ["list", "of", "detected", "allergens"],
  "dietaryFlags": ["contains-dairy", "high-sodium", "vegetarian", etc],
  "healthScore": 1_to_10_rating
}

IMPORTANT RULES FOR PREPARATION TIMES:

**prepTime (preparation time)**:
- This is ONLY time for ingredient preparation (washing, cutting, mixing)
- Do not include cooking, baking, or frying time
- For simple dishes (sandwiches, salads): 5-10 minutes
- For medium complexity (pasta, omelets): 10-15 minutes
- For complex dishes (many ingredients to chop): 15-25 minutes
- For very complex (many preparation processes): 25-40 minutes

**cookTime (cooking time)**:
- This is active cooking/baking/frying time
- For frying: 5-15 minutes
- For cooking pasta: 10-15 minutes
- For oven baking: 20-45 minutes
- For stewing: 20-60 minutes
- For grilling: 10-30 minutes

**Examples of realistic times**:
- Sandwich: prepTime: 5, cookTime: 0
- Scrambled eggs: prepTime: 3, cookTime: 5
- Pasta with sauce: prepTime: 10, cookTime: 15
- Salad: prepTime: 10, cookTime: 0
- Homemade pizza: prepTime: 20, cookTime: 15
- Roasted chicken: prepTime: 15, cookTime: 45
- Soup: prepTime: 15, cookTime: 30

OTHER RULES:
- If you recognize a recipe (e.g., Margherita Pizza, Spaghetti Carbonara), fill in fields: ingredients, instructions, prepTime, cookTime, cuisineType, difficulty
- If it's simple food without a recipe or a ready-made dish (e.g., store-bought), leave prepTime and cookTime as null or set to 0
- For ready/packaged products: prepTime: 0 or null, cookTime: 0 or null
- ingredients should be based on components, but in the form of cooking ingredients
- instructions are cooking steps (only for recognizable recipes)
- Always include at least one element in components
- Be REALISTIC with times - don't overestimate them
- Include healthScore (1-10): 1=very unhealthy, 5=moderate, 10=very healthy
- Detect common allergens: dairy, gluten, nuts, shellfish, eggs, soy, etc.
- Add dietaryFlags for: vegetarian, vegan, gluten-free, high-protein, low-carb, high-sodium, etc.`
            },
            {
              type: "image_url",
              image_url: { url: `data:image/${format};base64,${imageBase64}` }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    console.log('[Food Recognition] Received response from OpenAI');

    // Track token usage if userId is provided
    if (userId && response.usage) {
      await trackOpenAIUsage(userId, '/api/food-recognition/image', response, 'gpt-4o', startTime);
    }

    if (!response.choices[0].message.content) {
      throw new Error('Empty response from OpenAI');
    }

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
      console.log('[Food Recognition] Successfully parsed OpenAI response');
      
      // Normalize enum values to lowercase (OpenAI sometimes returns "Snack" instead of "snack")
      if (result.mealType && typeof result.mealType === 'string') {
        result.mealType = result.mealType.toLowerCase();
      }
      if (result.difficulty && typeof result.difficulty === 'string') {
        result.difficulty = result.difficulty.toLowerCase();
      }
      
    } catch (parseError) {
      console.error('[Food Recognition] JSON parse error:', parseError);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate the response structure
    console.log('[Food Recognition] Validating response structure...');
    
    // Check if components array exists and has items
    if (!result.components || !Array.isArray(result.components) || result.components.length === 0) {
      console.log('[Food Recognition] No components found in response, adding default component');
      
      // Add a default component if none exists
      result.components = [{
        name: "Unidentified food item",
        calories: result.calories || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0, 
        fat: result.fat || 0,
        servingSize: "1 portion",
        quantity: 1,
        details: {
          type: "Unknown food type",
          preparation: "Unknown preparation method",
          texture: "Unknown texture",
          color: "Unknown color",
          estimatedWeight: "Unknown weight"
        }
      }];
    }
    
    const validatedResult = FoodAnalysisSchema.parse(result);
    console.log('[Food Recognition] Validation successful');

    return validatedResult;
  } catch (error: any) {
    console.error('[Food Recognition] Analysis error:', error);

    if (error instanceof z.ZodError) {
      console.error('[Food Recognition] Validation errors:', JSON.stringify(error.errors, null, 2));
      throw new Error('Invalid response format: ' + error.errors.map(e => e.message).join(', '));
    }

    // Enhance error message for API key issues
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key configuration error. Please ensure the API key is properly set.');
    }

    throw error;
  }
}

function isValidImageFormat(base64String: string): boolean {
  // Check if it's empty
  if (!base64String) return false;

  // Handle data URL format
  if (base64String.startsWith('data:image/')) {
    const validFormats = ['png', 'jpeg', 'jpg', 'gif', 'webp'];
    return validFormats.some(format =>
      base64String.toLowerCase().startsWith(`data:image/${format}`)
    );
  }

  // Handle raw base64 string - be more lenient here
  try {
    // Remove any whitespace and check if it's valid base64
    const cleaned = base64String.replace(/\s/g, '');
    Buffer.from(cleaned, 'base64');
    return true; // If we can decode it as base64, consider it valid
  } catch {
    return false;
  }
}

export async function analyzeFoodImage(imageBase64: string, userId?: number, language?: string): Promise<FoodAnalysis> {
  try {
    console.log('[Food Recognition] Starting image analysis...');

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    // Clean up base64 string if needed
    let cleanedImage = imageBase64;
    if (!cleanedImage.startsWith('data:image/')) {
      // Try to detect image format from the binary data
      const prefix = cleanedImage.substring(0, 100); // Check beginning of data
      let format = 'jpeg'; // Default to jpeg
      
      // Check for common image signatures in binary data
      if (prefix.startsWith('/9j/')) {
        format = 'jpeg';
      } else if (prefix.startsWith('iVBOR')) {
        format = 'png';
      } else if (prefix.startsWith('R0lG')) {
        format = 'gif';
      } else if (prefix.startsWith('UklGR')) {
        format = 'webp';
      }
      
      console.log(`[Food Recognition] Adding data:image/${format} prefix to raw base64 data`);
      cleanedImage = `data:image/${format};base64,${cleanedImage}`;
    }

    // Extract base64 data for OpenAI
    const base64Data = cleanedImage.includes('base64,')
      ? cleanedImage.split('base64,')[1]
      : cleanedImage;
      
    // Validate the base64 data by trying to decode it
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length === 0) {
        throw new Error('Empty image data');
      }
      
      // Check file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (buffer.length > MAX_SIZE) {
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
        throw new Error(`Image too large (${sizeMB}MB). Maximum size is 10MB.`);
      }
      
      console.log('[Food Recognition] Valid base64 image data verified, size:', 
        (buffer.length / 1024).toFixed(1), 'KB');
    } catch (error) {
      console.error('[Food Recognition] Invalid base64 image:', error);
      
      // More descriptive error message based on the error type
      if (error instanceof Error) {
        if (error.message.includes('too large')) {
          throw error; // Keep the specific error message for size limits
        }
      }
      
      throw new Error('Invalid image format. Please use only JPEG, PNG, GIF, or WEBP image formats.');
    }

    // Get analysis from OpenAI - use detected format
    const format = cleanedImage.match(/data:image\/([a-zA-Z0-9]+);base64,/)?.[1] || 'jpeg';
    console.log(`[Food Recognition] Using format ${format} for OpenAI analysis`);
    
    // Fetch user's dietary profile for allergen detection
    let dietaryProfile: UserDietaryProfile | null = null;
    if (userId) {
      dietaryProfile = await getUserDietaryProfile(userId);
      if (dietaryProfile?.allergies) {
        console.log(`[Food Recognition] User has allergies: ${dietaryProfile.allergies}`);
      }
    }
    
    const result = await analyzeWithOpenAI(base64Data, format, userId, dietaryProfile, language);
    console.log('[Food Recognition] Analysis result:', JSON.stringify(result, null, 2));

    return result;
  } catch (error: any) {
    console.error('[Food Recognition] Error:', error);
    throw error;
  }
}

// Add ingredient-specific schema
const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  estimatedWeight: z.number(),
  freshness: z.string().optional(),
  quality: z.string().optional(),
}).strict();

const RecipeAnalysisSchema = z.object({
  ingredients: z.array(IngredientSchema),
  confidence: z.number(),
  suggestions: z.array(z.object({
    name: z.string(),
    difficulty: z.string(),
    prepTime: z.number(),
    cookingTime: z.number(),
    flavor: z.string(),
    cuisine: z.string().optional(),
    matchPercentage: z.number(),
  })),
}).strict();

export type RecipeAnalysis = z.infer<typeof RecipeAnalysisSchema>;

async function generateRecipeSuggestions(ingredients: any[], userId?: number): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ingredientsList = ingredients.map(i => i.name).join(', ');
    
    // Fetch user's dietary profile for safe recipe generation
    let dietaryProfile: UserDietaryProfile | null = null;
    let dietaryConstraints = '';
    if (userId) {
      dietaryProfile = await getUserDietaryProfile(userId);
      if (dietaryProfile) {
        const constraints: string[] = [];
        if (dietaryProfile.allergies?.trim()) {
          constraints.push(`CRITICAL - User has ALLERGIES to: ${dietaryProfile.allergies}. NEVER include these ingredients.`);
        }
        if (dietaryProfile.dietaryRestrictions?.trim()) {
          constraints.push(`Dietary restrictions: ${dietaryProfile.dietaryRestrictions}`);
        }
        if (dietaryProfile.experienceLevel?.trim()) {
          constraints.push(`Cooking skill level: ${dietaryProfile.experienceLevel} - adjust recipe complexity accordingly`);
        }
        if (dietaryProfile.mealBudget?.trim()) {
          constraints.push(`Budget preference: ${dietaryProfile.mealBudget}`);
        }
        dietaryConstraints = constraints.length > 0 ? `\n\nUSER DIETARY PROFILE:\n${constraints.join('\n')}` : '';
      }
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a creative chef who creates safe, delicious recipes. Generate unique recipe suggestions based on available ingredients while respecting all dietary restrictions and allergies.${dietaryConstraints}`
        },
        {
          role: "user",
          content: `Create creative recipe suggestions using these ingredients: ${ingredientsList}. 
            Return the suggestions as a JSON object with this structure:
            {
              "recipes": [
                {
                  "name": "Recipe name",
                  "description": "Brief description",
                  "ingredients": ["ingredient with quantity"],
                  "instructions": ["step 1", "step 2"],
                  "prepTime": 15,
                  "cookTime": 30,
                  "difficulty": "easy|medium|hard",
                  "servings": 4,
                  "nutrition": {"calories": 400, "protein": 25, "carbs": 30, "fat": 15},
                  "matchPercentage": 85,
                  "missingIngredients": ["ingredient not in available list"],
                  "dietaryInfo": ["vegetarian", "gluten-free", etc]
                }
              ]
            }
            Include at least 3 recipe suggestions, sorted by matchPercentage (highest first).`
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    // Track token usage if userId is provided
    if (userId && response.usage) {
      await trackOpenAIUsage(userId, '/api/recipes/suggestions', response, 'gpt-4o', startTime);
    }

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content);
  } catch (error) {
    console.error('Recipe Generation Error:', error);
    throw error;
  }
}

export async function analyzeIngredientsWithOpenAI(imageBase64: string, userId?: number, language?: string): Promise<{
  ingredients: any[];
  recipes?: any;
  confidence?: number;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Recipe Analysis] OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    // Clean up base64 string if needed
    let base64Image = imageBase64;
    let format = 'jpeg'; // Default format
    
    if (base64Image.includes('data:image/')) {
      // Extract format from the mimetype
      const mimeMatch = base64Image.match(/data:image\/([a-zA-Z0-9]+);base64,/);
      if (mimeMatch && mimeMatch[1]) {
        format = mimeMatch[1].toLowerCase();
      }
      base64Image = base64Image.split(',')[1];
    } else {
      // Try to detect image format from the binary data
      const prefix = base64Image.substring(0, 100); // Check beginning of data
      
      if (prefix.startsWith('/9j/')) {
        format = 'jpeg';
      } else if (prefix.startsWith('iVBOR')) {
        format = 'png';
      } else if (prefix.startsWith('R0lG')) {
        format = 'gif';
      } else if (prefix.startsWith('UklGR')) {
        format = 'webp';
      }
    }
    
    console.log(`[Recipe Analysis] Detected image format: ${format}, language: ${language || 'en'}`);

    // Validate base64 string
    try {
      const buffer = Buffer.from(base64Image, 'base64');
      if (buffer.length === 0) {
        throw new Error('Invalid image data');
      }
      console.log('[Recipe Analysis] Valid base64 image verified, size:', buffer.length, 'bytes');
    } catch (error) {
      console.error('[Recipe Analysis] Invalid base64 image:', error);
      throw new Error('Invalid image format. Please use only JPEG, PNG, GIF, or WEBP image formats.');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('[Recipe Analysis] Initializing ingredient analysis...');
    
    // Fetch user's dietary profile for safety warnings
    let dietaryProfile: UserDietaryProfile | null = null;
    if (userId) {
      dietaryProfile = await getUserDietaryProfile(userId);
    }
    
    // Build allergen warning section
    const allergenSection = dietaryProfile?.allergies?.trim() 
      ? `\n\nALLERGEN ALERT: User is allergic to: ${dietaryProfile.allergies}\nIf any ingredient may contain or be related to these allergens, add "allergenRisk": true to that ingredient.`
      : '';
    
    // Build language instruction
    const languageInstruction = buildLanguageInstruction(language);

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a precise ingredient analysis system that identifies individual ingredients from food images. Be thorough and accurate.${allergenSection}${languageInstruction}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and identify all individual ingredients visible. Focus on raw ingredients, vegetables, fruits, proteins, spices, etc. Be specific and detailed.

Return ONLY a JSON response with this exact structure:
{
  "ingredients": [
    {
      "name": "specific ingredient name",
      "quantity": 1,
      "unit": "piece",
      "estimatedWeight": 100,
      "freshness": "fresh",
      "quality": "good quality",
      "allergenRisk": false,
      "category": "vegetable|fruit|protein|dairy|grain|spice|other"
    }
  ],
  "confidence": 0.9,
  "totalEstimatedCalories": 500,
  "suggestedMealType": "lunch|dinner|breakfast|snack"
}

Examples:
- If you see tomatoes, identify them as "tomatoes" not "red vegetables"
- If you see onions, specify "yellow onions" or "red onions" 
- If you see herbs, identify specific ones like "basil" or "parsley"
- Include reasonable quantity estimates based on what's visible
- Flag any ingredients that may pose allergen risks`
            },
            {
              type: "image_url",
              image_url: { url: `data:image/${format};base64,${base64Image}` }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    console.log('[Recipe Analysis] Received response from OpenAI');

    // Track token usage if userId is provided
    if (userId && response.usage) {
      await trackOpenAIUsage(userId, '/api/ingredients/analyze', response, 'gpt-4o', startTime);
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    let result;
    try {
      result = JSON.parse(content);
      console.log('[Recipe Analysis] Successfully parsed OpenAI response');
    } catch (parseError) {
      console.error('[Recipe Analysis] JSON parse error:', parseError);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate the response structure has ingredients
    if (!result.ingredients || !Array.isArray(result.ingredients)) {
      console.error('[Recipe Analysis] Invalid response - missing ingredients array');
      throw new Error('Invalid response format - missing ingredients');
    }

    console.log('[Recipe Analysis] Found', result.ingredients.length, 'ingredients');

    // Return ingredients with confidence
    return {
      ingredients: result.ingredients,
      confidence: result.confidence || 0.8
    };
  } catch (error: any) {
    console.error('[Recipe Analysis] Analysis error:', error);

    if (error instanceof z.ZodError) {
      console.error('[Recipe Analysis] Validation errors:', JSON.stringify(error.errors, null, 2));
      throw new Error('Invalid response format: ' + error.errors.map(e => e.message).join(', '));
    }

    // Enhance error messages for common issues
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key configuration error. Please ensure the API key is properly set.');
    }
    if (error.message.includes('Invalid image format')) {
      throw new Error('Invalid image format. Please ensure you are uploading a valid image file.');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    throw error;
  }
}

function getNutritionalInfo(foodItem: string): FoodAnalysis {
  try {
    const parts = foodItem.toLowerCase().match(/^(\d+)?\s*(.+)$/);
    const quantity = parts && parts[1] ? parseInt(parts[1]) : 1;
    const itemName = parts ? parts[2].trim() : foodItem.toLowerCase();

    let matchedItem: string | null = null;
    for (const standardItem of Object.keys(STANDARD_PORTIONS)) {
      if (itemName.includes(standardItem)) {
        matchedItem = standardItem;
        break;
      }
    }

    if (matchedItem) {
      const standardPortion = STANDARD_PORTIONS[matchedItem as keyof typeof STANDARD_PORTIONS];
      console.log(`Using standard portion for ${foodItem} (quantity: ${quantity}):`, standardPortion);

      return {
        name: foodItem,
        calories: standardPortion.calories * quantity,
        protein: standardPortion.protein * quantity,
        carbs: standardPortion.carbs * quantity,
        fat: standardPortion.fat * quantity,
        confidence: 0.95,
        components: [{
          name: foodItem,
          calories: standardPortion.calories * quantity,
          protein: standardPortion.protein * quantity,
          carbs: standardPortion.carbs * quantity,
          fat: standardPortion.fat * quantity,
          servingSize: `${quantity} × ${standardPortion.servingSize}`,
          quantity: quantity,
          details: {
            type: "standardized portion",
            preparation: "as served",
            texture: "standard",
            color: "standard",
            estimatedWeight: standardPortion.servingSize.split(' ')[1],
            cookingMethod: "as served",
            doneness: "as served",
            temperature: "room temperature",
            accompaniments: [],
            sauce: "none",
            seasonings: [],
            garnishes: [],
            presentation: "standard serving"
          }
        }]
      };
    }

    throw new Error('Item not found in standard portions');
  } catch (error) {
    console.error('Error getting nutritional info:', error);
    throw error;
  }
}

export async function validateMacrosWithChatGPT(foodItems: string[], userId?: number): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  breakdown?: Array<{
    item: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  healthInsights?: string[];
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const foodItemsList = foodItems.join(', ');
    
    // Fetch user's dietary profile for context
    let contextInfo = '';
    if (userId) {
      const dietaryProfile = await getUserDietaryProfile(userId);
      if (dietaryProfile?.allergies) {
        contextInfo = `\n\nNote: Check if any items contain allergens: ${dietaryProfile.allergies}`;
      }
    }

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a certified nutritionist with expertise in food analysis. Provide accurate macro estimates using USDA database standards as reference. Be conservative with estimates - it's better to slightly underestimate than overestimate portions.${contextInfo}`
        },
        {
          role: "user",
          content: `Analyze these food items and provide accurate macro estimates: ${foodItemsList}. 
            
Use these guidelines:
- Consider standard restaurant/home portions
- Account for typical preparation methods (fried, baked, etc.)
- Include hidden calories (oils, sauces, butter)
- Be conservative with portion estimates

Return a JSON object with this structure:
{
  "calories": total_calories,
  "protein": total_protein_grams,
  "carbs": total_carbs_grams,
  "fat": total_fat_grams,
  "confidence": 0.0_to_1.0,
  "breakdown": [
    {
      "item": "food item name",
      "calories": item_calories,
      "protein": item_protein,
      "carbs": item_carbs,
      "fat": item_fat
    }
  ],
  "healthInsights": [
    "This meal is high in protein",
    "Consider adding more vegetables",
    etc
  ],
  "allergenWarnings": ["contains gluten", "may contain dairy"]
}`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    // Track token usage if userId is provided
    if (userId && response.usage) {
      await trackOpenAIUsage(userId, '/api/macros/validate', response, 'gpt-4o', startTime);
    }

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const result = JSON.parse(content);
    console.log('ChatGPT Macro Validation:', result);

    return {
      calories: Math.round(result.calories),
      protein: Number(result.protein.toFixed(1)),
      carbs: Number(result.carbs.toFixed(1)),
      fat: Number(result.fat.toFixed(1)),
      confidence: result.confidence,
      breakdown: result.breakdown,
      healthInsights: result.healthInsights
    };
  } catch (error) {
    console.error('ChatGPT Macro Validation Error:', error);
    throw error;
  }
}

const STANDARD_PORTIONS = {
  'big mac': {
    calories: 550,
    protein: 25,
    carbs: 45,
    fat: 30,
    servingSize: '1 sandwich (240g)'
  },
  'cheeseburger': {
    calories: 300,
    protein: 15,
    carbs: 33,
    fat: 12,
    servingSize: '1 sandwich (119g)'
  },
  'chicken mcnuggets': {
    calories: 420,
    protein: 22,
    carbs: 26,
    fat: 25,
    servingSize: '10 pieces (162g)'
  },
  'french fries': {
    calories: 380,
    protein: 4,
    carbs: 54,
    fat: 16,
    servingSize: 'Medium size (147g)'
  },
  'coca-cola': {
    calories: 210,
    protein: 0,
    carbs: 55,
    fat: 0,
    servingSize: 'Medium size (500ml)'
  }
} as const;