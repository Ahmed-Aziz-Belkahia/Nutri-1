import OpenAI from "openai";
import { trackOpenAIUsage, trackFailedRequest } from "../utils/token-tracker";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || '' // Use empty string as fallback to avoid null errors
});
// Language code to full name mapping
const languageNames: Record<string, string> = {
  'en': 'English',
  'fr': 'French',
  'pl': 'Polish',
  'es': 'Spanish',
  'ar': 'Arabic'
};

// Helper function to build language instruction for AI prompts
function buildLanguageInstruction(languageCode?: string): string {
  if (!languageCode || languageCode === 'en') {
    return ''; // Default English, no special instruction needed
  }
  
  const languageName = languageNames[languageCode] || 'English';
  return `\n\nLANGUAGE REQUIREMENT: Return ALL text values (names, descriptions, ingredients, instructions, food names, meal names) in ${languageName}. Keep all JSON keys in English - only translate the VALUES.`;
}
export async function analyzeFoodText(foodDescription: string, userId?: number, language?: string): Promise<{
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
  const languageInstruction = buildLanguageInstruction(language);
  
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
    const startTime = Date.now();
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
          4. Be very specific and detailed with the component names${languageInstruction}
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more consistent results
    });

    // Track token usage if userId is provided
    if (userId && response.usage) {
      await trackOpenAIUsage(userId, '/api/food-recognition/text', response, 'gpt-4o', startTime);
    }

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
          const componentNames = result.components.map((c: any) => c.name).filter(Boolean);
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
        components: Array.isArray(result.components) ? result.components.map((component: any) => ({
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
