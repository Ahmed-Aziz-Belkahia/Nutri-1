import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function generateRecipes(ingredients: string[], preferences: { difficulty: string; timeNeeded: number; flavor: string }) {
  try {
    console.log('[OpenAI] Generating recipes with:', {
      ingredients,
      preferences
    });

    const prompt = `Create recipes using these ingredients: ${ingredients.join(', ')}.
Requirements:
- Difficulty level: ${preferences.difficulty}
- Time needed: ${preferences.timeNeeded} minutes
- Flavor profile: ${preferences.flavor}

CRITICALLY IMPORTANT FOR INSTRUCTIONS:
- Create cooking instructions as flowing, logical paragraphs
- Each instruction should begin with action verbs (Take, Heat, Mix, Pour, etc.)
- Start instructions with the tools/equipment needed: "Heat a large pan" or "Take a mixing bowl"
- Group related actions into single, coherent steps
- Include measurements and timing details within steps
- Ensure a logical flow from preparation to finishing touches
- Include visual cues for doneness (e.g., "Cook until golden brown")

Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "ingredients": ["Ingredient 1 with amount", "Ingredient 2 with amount"],
      "instructions": ["Start by preheating your oven to 350°F (175°C) and greasing a baking dish. In a large mixing bowl, combine the flour, sugar, and salt, stirring until well mixed. Next, add the butter and use your fingertips to work it into the dry ingredients until the mixture resembles coarse crumbs.", "Pour in the milk and vanilla extract, then stir gently until a soft dough forms. Be careful not to overmix. Transfer the dough to a lightly floured surface and knead gently a few times until smooth."],
      "difficulty": "${preferences.difficulty}",
      "prepTime": ${preferences.timeNeeded},
      "cookingTime": number,
      "flavor": "${preferences.flavor}",
      "cuisine": "cuisine type",
      "nutritionalInfo": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number
      }
    }
  ]
}`;



    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional chef specializing in creating recipes from available ingredients. Provide detailed, accurate recipes with exact measurements and clear instructions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices?.[0]?.message?.content ?? '';

    if (!content || typeof content !== 'string') {
      throw new Error('Empty content from OpenAI');
    }
    const result = JSON.parse(content);
    return result;

  } catch (error) {
    console.error('OpenAI Recipe Generation Error:', error);
    throw new Error(`Failed to generate recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}