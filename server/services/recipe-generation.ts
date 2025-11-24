import OpenAI from 'openai';
import { z } from 'zod';
import { insertRecipeSchema } from '@db/schema';

// More flexible preference schema
const UserPreferencesSchema = z.object({
  difficulty: z.string(), // Allow any string value for more flexibility
  timeNeeded: z.union([z.number(), z.string()]).transform(v => 
    typeof v === 'string' ? parseInt(v) || 30 : v
  ), // Accept string or number
  flavor: z.string(), // Allow any string value
  mealType: z.string().optional(), // Add meal type (breakfast/lunch/dinner/snack)
  language: z.string().optional(), // Add language preference
  notes: z.string().optional(), // Add notes for preparation instructions
}).passthrough(); // Allow additional properties

// More flexible recipe output schema
const GeneratedRecipeSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(''),
  ingredients: z.array(z.string()),
  instructions: z.union([
    z.string(),
    z.array(z.string())
  ]),
  nutritionInfo: z.object({
    calories: z.union([z.number(), z.string()]).transform(v => 
      typeof v === 'string' ? parseInt(v) || 0 : v
    ),
    protein: z.union([z.number(), z.string()]).transform(v => 
      typeof v === 'string' ? parseInt(v) || 0 : v
    ),
    carbs: z.union([z.number(), z.string()]).transform(v => 
      typeof v === 'string' ? parseInt(v) || 0 : v
    ).optional(),
    carbohydrates: z.union([z.number(), z.string()]).transform(v => 
      typeof v === 'string' ? parseInt(v) || 0 : v
    ).optional(),
    fat: z.union([z.number(), z.string()]).transform(v => 
      typeof v === 'string' ? parseInt(v) || 0 : v
    ),
  }).optional().default({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }),
  difficulty: z.string().optional().default('Medium'),
  prepTime: z.union([z.number(), z.string()]).transform(v => 
    typeof v === 'string' ? parseInt(v) || 30 : v
  ).optional().default(30),
  flavor: z.string().optional().default('Mixed'),
}).passthrough(); // Allow additional properties

// Schema for the recipe array response
const RecipesResponseSchema = z.object({
  recipes: z.array(GeneratedRecipeSchema)
});

export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// Import JSONFix for robust JSON parsing
import * as fs from 'fs';
import * as path from 'path';

// Helper function to log JSON errors for debugging
function logJsonDebug(rawJson: string, error: any) {
  try {
    const debugDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const filename = path.join(debugDir, `json-debug-${Date.now()}.json`);
    fs.writeFileSync(filename, rawJson);
    console.log(`Logged problematic JSON to ${filename}`);
  } catch (e) {
    console.error('Failed to log JSON debug info:', e);
  }
}

// Advanced JSON fixing utility
function safeParseJson(jsonString: string): any {
  // First try normal parsing
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('Initial JSON parse failed, attempting repairs');
    
    // Try with relaxed JSON parsing methods
    try {
      // 1. Try JSON5 style relaxed parsing (allowing unquoted keys, trailing commas, etc)
      let fixedJson = jsonString
        // Fix unquoted property names
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        // Fix single quotes
        .replace(/([{,]\s*)"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s*:\s*'([^']*)'/g, '$1"$2":"$3"')
        // Fix trailing commas in objects
        .replace(/,(\s*})/g, '$1')
        // Fix trailing commas in arrays
        .replace(/,(\s*\])/g, '$1')
        // Fix missing quotes around string values
        .replace(/:(\s*)([a-zA-Z_][a-zA-Z0-9_]*(?:\s+[a-zA-Z_][a-zA-Z0-9_]*)*)\s*([},])/g, ':"$2"$3');
        
      // Find and fix instructions that are provided as a long string instead of array
      // This typically causes the parsing issue we're seeing
      const instructionsMatch = fixedJson.match(/"instructions"\s*:\s*"([^"]*)"/g);
      if (instructionsMatch) {
        console.log('Found raw instructions string, converting to array');
        
        // Go through each match and convert the string to an array
        for (const match of instructionsMatch) {
          try {
            // Extract the raw text from the match
            const rawInstructions = match.match(/"instructions"\s*:\s*"([^"]*)"/)?.[1] || '';
            
            // Split instructions by periods or steps and clean them up
            const instructionsArray = rawInstructions
              .split(/\.\s+|\d+\.\s+/)
              .map(s => s.trim())
              .filter(s => s.length > 0)
              .map(s => s.endsWith('.') ? s : s + '.');
            
            // Format as a JSON array string
            const arrayString = JSON.stringify(instructionsArray);
            
            // Replace the string with the array in the JSON
            fixedJson = fixedJson.replace(match, `"instructions": ${arrayString}`);
          } catch (e) {
            console.warn('Failed to convert instructions string to array:', e);
          }
        }
      }
      
      try {
        return JSON.parse(fixedJson);
      } catch (e2) {
        // Log the problem for debugging
        logJsonDebug(jsonString, e);
        
        // 2. If still failing, try a more aggressive approach
        // Remove all newlines and extra whitespace first
        const compactJson = jsonString.replace(/\s+/g, ' ').trim();
        
        // Extract just the content between the outer braces if needed
        const extracted = compactJson.match(/\{(.*)\}/);
        if (extracted && extracted[0]) {
          try {
            return JSON.parse(extracted[0]);
          } catch (e3) {
            // Continue with other repair attempts
          }
        }
        
        // This is likely a more complex structural issue
        // We know formats tend to come back as {"recipes": [{"name": "..."}, ...]}
        // Try to extract the recipes array by finding a common pattern in the JSON
        const recipesMatch = compactJson.match(/{\s*"recipes"\s*:\s*\[\s*{.+}\s*\]\s*}/);
        if (recipesMatch && recipesMatch[0]) {
          console.log('Attempting to parse extracted recipes array');
          try {
            return JSON.parse(recipesMatch[0]);
          } catch (e4) {
            console.warn('Failed to parse extracted recipes array');
          }
        }
        
        throw e2;
      }
    } catch (repairError) {
      throw repairError;
    }
  }
}

export async function generateRecipe(
  ingredients: string[],
  preferences: UserPreferences,
  customPrompt?: string
): Promise<{recipes: GeneratedRecipe[]}> {
  try {
    // Validate input
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error('Invalid ingredients: Must provide at least one ingredient');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a professional chef and culinary instructor specializing in creating detailed, easy-to-follow recipes. 
Consider these specific preferences:
- Difficulty level: ${preferences.difficulty}
- Time available: ${preferences.timeNeeded} minutes
- Preferred flavor profile: ${preferences.flavor}
${preferences.mealType && preferences.mealType !== 'Any' ? `- Meal type: ${preferences.mealType}` : ''}
${preferences.notes ? `- Preparation notes: ${preferences.notes}` : ''}

For each recipe:
1. Ensure the difficulty matches the user's preference
2. Keep total preparation and cooking time within the specified time limit
3. Adjust seasonings and ingredients to match the desired flavor profile
4. Provide exact measurements, temperatures, and timing
5. Include equipment needed
6. Break down complex techniques into simple steps
7. Add cooking tips and visual indicators for doneness
8. Include food safety reminders`;

    const userPrompt = `
Create 2 different recipe ideas using these ingredients: ${ingredients.join(', ')}.
Each recipe must match these preferences:
- Difficulty: ${preferences.difficulty}
- Total time needed: ${preferences.timeNeeded} minutes
- Flavor profile: ${preferences.flavor}
${preferences.mealType && preferences.mealType !== 'Any' ? `- Meal type: ${preferences.mealType}` : ''}
${preferences.notes ? `\nIMPORTANT NOTES AND PREPARATION INSTRUCTIONS:
${preferences.notes}` : ''}
${customPrompt ? `\nADDITIONAL INSTRUCTIONS:
${customPrompt}` : ''}

CRITICALLY IMPORTANT - FORMAT INSTRUCTIONS:
- Format all instructions as an ARRAY of strings, where each string is a complete step
- Example of good instructions format: ["Preheat the oven to 350°F.", "In a large bowl, combine flour and sugar.", "Stir in milk until smooth."]
- DO NOT format instructions as a single string
- DO NOT use nested arrays or objects within the instructions array
- Keep each step concise and focused on one task

For each step in the instructions:
- Start with an action verb
- Include measurements and timing details
- Add visual cues for doneness when applicable
- Use simple language and clear directions

The response MUST be a JSON object with this exact structure:
{
  "recipes": [
    {
      "name": "Recipe Name 1",
      "description": "Brief but appetizing description 1",
      "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount"],
      "instructions": ["Step 1: Preheat the oven to 350°F.", "Step 2: In a large bowl, combine flour and sugar."],
      "nutritionInfo": {
        "calories": 350,
        "protein": 15,
        "carbs": 40,
        "fat": 10
      },
      "difficulty": "${preferences.difficulty}",
      "prepTime": ${preferences.timeNeeded},
      "flavor": "${preferences.flavor}"
    },
    {
      "name": "Recipe Name 2",
      "description": "Brief but appetizing description 2",
      "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount"],
      "instructions": ["Step 1: Heat a pan over medium heat.", "Step 2: Add oil and chopped vegetables."],
      "nutritionInfo": {
        "calories": 300,
        "protein": 12,
        "carbs": 35,
        "fat": 8
      },
      "difficulty": "${preferences.difficulty}",
      "prepTime": ${preferences.timeNeeded},
      "flavor": "${preferences.flavor}"
    }
  ]
}`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    try {
      // Sanitize content before parsing to prevent unterminated JSON strings
      let sanitizedContent = content;
      
      // Make sure we're only processing JSON content
      if (sanitizedContent.includes('```json')) {
        sanitizedContent = sanitizedContent.split('```json')[1].split('```')[0].trim();
        console.log('Extracted JSON content from markdown code block');
      }
      
      // Advanced JSON repair to handle common errors
      try {
        // 1. Look for JSON content starting with { and ending with }
        const jsonMatch = sanitizedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          sanitizedContent = jsonMatch[0];
          console.log('Extracted JSON object from response');
        }
        
        // 2. Handle common problematic characters
        sanitizedContent = sanitizedContent
          .replace(/\n/g, ' ')             // Replace newlines with spaces
          .replace(/\\"/g, '\\\\"')        // Fix escaped quotes
          .replace(/\t/g, ' ')             // Replace tabs with spaces
          .replace(/\r/g, '')              // Remove carriage returns
          .replace(/([^\\])\\(?!["\\/bfnrt])/g, '$1\\\\'); // Fix invalid escape sequences
        
        // 3. Balance quotes, brackets and braces
        const openBraces = (sanitizedContent.match(/\{/g) || []).length;
        const closeBraces = (sanitizedContent.match(/\}/g) || []).length;
        const openBrackets = (sanitizedContent.match(/\[/g) || []).length;
        const closeBrackets = (sanitizedContent.match(/\]/g) || []).length;
        const quotes = (sanitizedContent.match(/"/g) || []).length;
        
        if (quotes % 2 !== 0) {
          console.log('Unbalanced quotes detected, attempting to fix');
          // Find last quote that appears to be properly matched, then truncate
          let quoteCount = 0;
          let lastValidPos = -1;
          
          for (let i = 0; i < sanitizedContent.length; i++) {
            if (sanitizedContent[i] === '"' && (i === 0 || sanitizedContent[i-1] !== '\\')) {
              quoteCount++;
              if (quoteCount % 2 === 0) {
                lastValidPos = i;
              }
            }
          }
          
          if (lastValidPos > -1) {
            // Truncate to last valid paired quote position plus additional closing
            sanitizedContent = sanitizedContent.substring(0, lastValidPos + 1);
            
            // Close unclosed structures
            sanitizedContent += '}'.repeat(Math.max(0, openBraces - closeBraces));
            sanitizedContent += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
          }
        }
        
        // 4. Balance remaining structures
        if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
          console.log('Unbalanced braces or brackets detected, attempting to fix');
          sanitizedContent += '}'.repeat(Math.max(0, openBraces - closeBraces));
          sanitizedContent += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        }
        
        console.log('Applied extensive JSON repairs');
      } catch (sanitizeError) {
        console.warn('Error during advanced JSON repair:', sanitizeError);
        // We'll continue with the original content
        sanitizedContent = content;
      }
      
      console.log('Attempting to parse OpenAI response');
      let parsed;
      try {
        // Use our safer JSON parser instead of standard JSON.parse
        parsed = safeParseJson(sanitizedContent);
        console.log('API response structure:', Object.keys(parsed));
      } catch (parseError) {
        console.error('Parse error:', parseError);
        
        // Try to fix the JSON more aggressively
        try {
          // More aggressive JSON repairs for broken structures
          const fixedContent = sanitizedContent
            // Fix unquoted property names, trailing commas, missing quotes, etc.
            .replace(/([{\[,])\s*"?\s*([^{["\s]+)\s*"?\s*:/g, '$1"$2":')  // Fix unquoted property names
            .replace(/:([^{[\]},\s"][^{[\]},]*?)([,}\]])/g, ':"$1"$2')    // Fix unquoted string values
            .replace(/(,)(\s*[}\]])/g, '$2')                              // Fix trailing commas
            .replace(/([^\\])(")([^"]*$)/g, '$1$2$3"')                    // Fix unclosed quotes at end
            // Fix missing commas between array items or object properties
            .replace(/}(\s*){/g, '},\n{')
            .replace(/](\s*)\[/g, '],\n[')
            .replace(/"(\s*){/g, '",\n{');
            
          // Use our safer JSON parser for this attempt too
          parsed = safeParseJson(fixedContent);
          console.log('Fixed JSON parsing with enhanced repair techniques');
        } catch (secondError) {
          // If still failing, try a more aggressive approach - extract what we can
          console.error('Second parse attempt failed:', secondError);
          
          // Create proper fallback recipes with the ingredients
          const fallbackRecipes = [
            {
              name: "Fresh Fruit & Vegetable Salad",
              description: "A vibrant, refreshing salad that combines all your fresh ingredients with a simple citrus dressing",
              ingredients: [
                ...ingredients.map(ing => `${ing}`),
                "2 tablespoons olive oil",
                "1 tablespoon honey or maple syrup",
                "Salt and pepper to taste"
              ],
              instructions: [
                "Wash and prepare all fruits and vegetables.",
                "Cut larger items into bite-sized pieces.",
                "Combine all ingredients in a large bowl.",
                "Squeeze citrus juice over the mixture.",
                "Drizzle with olive oil and sweetener.",
                "Season with salt and pepper to taste.",
                "Toss gently to combine and serve immediately."
              ],
              prepTime: 15,
              difficulty: "Easy",
              flavor: "Fresh & Tangy",
              nutritionInfo: {
                calories: 220,
                protein: 5,
                carbs: 35,
                fat: 8
              }
            },
            {
              name: "Mixed Vegetable Stir-Fry",
              description: "A quick and healthy stir-fry using your available ingredients",
              ingredients: [
                ...ingredients.map(ing => `${ing}`),
                "2 tablespoons vegetable oil",
                "2 cloves garlic, minced",
                "1 tablespoon soy sauce",
                "1 teaspoon ginger (optional)"
              ],
              instructions: [
                "Prepare all fruits and vegetables by washing and cutting into similar-sized pieces.",
                "Heat oil in a large pan or wok over medium-high heat.",
                "Add garlic and ginger (if using) and stir for 30 seconds until fragrant.",
                "Add firmer vegetables first, cooking for 2-3 minutes.",
                "Add softer vegetables and continue cooking for another 2-3 minutes.",
                "Add soy sauce and toss to combine.",
                "Serve hot, optionally with rice or noodles."
              ],
              prepTime: 20,
              difficulty: "Medium",
              flavor: "Savory",
              nutritionInfo: {
                calories: 180,
                protein: 6,
                carbs: 22,
                fat: 9
              }
            }
          ];
          
          // Validate the fallback recipes through our schema
          const validatedRecipes = fallbackRecipes.map(recipe => 
            GeneratedRecipeSchema.parse(recipe)
          );
          
          // Return our nicely formatted fallback recipes
          console.log('Using fallback recipes due to parsing issues');
          return { recipes: validatedRecipes };
        }
      }
      
      // Try to validate using the expected RecipesResponseSchema first
      try {
        if (parsed.recipes && Array.isArray(parsed.recipes)) {
          const validatedResponse = RecipesResponseSchema.parse(parsed);
          console.log(`Successfully validated ${validatedResponse.recipes.length} recipes`);
          return validatedResponse;
        }
      } catch (validationError) {
        console.warn('Response format validation error:', validationError);
        // Continue with fallback handling
      }
      
      // If it's just a single recipe instead of an array
      if (parsed.name || parsed.title) {
        console.log('Single recipe detected, converting to array');
        const validatedRecipe = GeneratedRecipeSchema.parse(parsed);
        return { recipes: [validatedRecipe] };
      }
      
      // Handle unexpected formats - look for recipes in any property
      console.warn('Unexpected recipe format, attempting to extract recipes');
      
      // Look for any array that might contain recipes
      for (const key in parsed) {
        if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
          const firstItem = parsed[key][0];
          if (firstItem && typeof firstItem === 'object' && 
              (firstItem.name || firstItem.title || firstItem.ingredients || firstItem.instructions)) {
            console.log(`Found recipes array in property "${key}"`);
            try {
              const validatedRecipes = parsed[key].map((recipe: any) => {
                // Normalize recipe data before validation
                const normalizedRecipe = {
                  ...recipe,
                  name: recipe.name || recipe.title || 'Generated Recipe',
                  description: recipe.description || '',
                  ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
                  instructions: Array.isArray(recipe.instructions) ? recipe.instructions : 
                               typeof recipe.instructions === 'string' ? [recipe.instructions] : [],
                  nutritionInfo: recipe.nutritionInfo || recipe.nutritional_info || {
                    calories: recipe.nutritionInfo?.calories || 0,
                    protein: recipe.nutritionInfo?.protein || 0,
                    carbs: recipe.nutritionInfo?.carbs || recipe.nutritionInfo?.carbohydrates || 0,
                    fat: recipe.nutritionInfo?.fat || 0
                  },
                  difficulty: recipe.difficulty || recipe.difficultyLevel || 'Medium',
                  prepTime: recipe.prepTime || recipe.prep_time || 30,
                  flavor: recipe.flavor || 'Mixed'
                };
                
                return GeneratedRecipeSchema.parse(normalizedRecipe);
              });
              return { recipes: validatedRecipes };
            } catch (err) {
              console.warn(`Error parsing recipes from "${key}" property:`, err);
              // Continue checking other properties
            }
          }
        } else if (typeof parsed[key] === 'object' && parsed[key] && 
                  (parsed[key].name || parsed[key].title || 
                   parsed[key].ingredients || parsed[key].instructions)) {
          console.log(`Found single recipe in property "${key}"`);
          try {
            // Normalize single recipe data
            const normalizedRecipe = {
              ...parsed[key],
              name: parsed[key].name || parsed[key].title || 'Generated Recipe',
              description: parsed[key].description || '',
              ingredients: Array.isArray(parsed[key].ingredients) ? parsed[key].ingredients : [],
              instructions: Array.isArray(parsed[key].instructions) ? parsed[key].instructions : 
                           typeof parsed[key].instructions === 'string' ? [parsed[key].instructions] : [],
              nutritionInfo: parsed[key].nutritionInfo || parsed[key].nutritional_info || {
                calories: parsed[key].nutritionInfo?.calories || 0,
                protein: parsed[key].nutritionInfo?.protein || 0,
                carbs: parsed[key].nutritionInfo?.carbs || parsed[key].nutritionInfo?.carbohydrates || 0,
                fat: parsed[key].nutritionInfo?.fat || 0
              },
              difficulty: parsed[key].difficulty || parsed[key].difficultyLevel || 'Medium',
              prepTime: parsed[key].prepTime || parsed[key].prep_time || 30,
              flavor: parsed[key].flavor || 'Mixed'
            };
            
            const validatedRecipe = GeneratedRecipeSchema.parse(normalizedRecipe);
            return { recipes: [validatedRecipe] };
          } catch (err) {
            console.warn(`Error parsing recipe from "${key}" property:`, err);
            // Continue checking other properties
          }
        }
      }
      
      // If we couldn't find anything that looks like recipes, make one last attempt
      // with the entire response
      console.log('No recipe structure found, attempting to treat entire response as a recipe');
      try {
        const normalizedRecipe = {
          ...parsed,
          name: parsed.name || parsed.title || 'Generated Recipe',
          description: parsed.description || '',
          ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
          instructions: Array.isArray(parsed.instructions) ? parsed.instructions : 
                       typeof parsed.instructions === 'string' ? [parsed.instructions] : [],
          nutritionInfo: parsed.nutritionInfo || parsed.nutritional_info || {
            calories: parsed.nutritionInfo?.calories || 0,
            protein: parsed.nutritionInfo?.protein || 0,
            carbs: parsed.nutritionInfo?.carbs || parsed.nutritionInfo?.carbohydrates || 0,
            fat: parsed.nutritionInfo?.fat || 0
          },
          difficulty: parsed.difficulty || parsed.difficultyLevel || 'Medium',
          prepTime: parsed.prepTime || parsed.prep_time || 30,
          flavor: parsed.flavor || 'Mixed'
        };
        
        const validatedRecipe = GeneratedRecipeSchema.parse(normalizedRecipe);
        return { recipes: [validatedRecipe] };
      } catch (err) {
        console.error('Final attempt to parse recipe failed:', err);
        throw new Error('Could not extract valid recipes from API response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      console.error('Parse error:', parseError);
      throw new Error('Invalid recipe format received from OpenAI');
    }

  } catch (error) {
    console.error('Recipe generation error:', error);
    if (error instanceof z.ZodError) {
      throw new Error('Invalid recipe format: ' + error.errors.map(e => e.message).join(', '));
    }
    throw new Error(error instanceof Error ? error.message : 'Failed to generate recipe');
  }
}