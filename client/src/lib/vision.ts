// Client-side API functions for food recognition via OpenAI Vision API

/**
 * Analyze food from text using the backend API
 */
export async function analyzeFoodText(text: string): Promise<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
  components?: Array<{
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
  console.log('Analyzing food text with OpenAI...', text);
  
  try {
    const response = await fetch('/api/analyze-food-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to analyze text (${response.status})`);
    }
    
    const result = await response.json();
    console.log('OpenAI food text analysis complete, result:', result);
    
    // Ensure all required fields are present
    if (!result || typeof result.name !== 'string' || typeof result.calories !== 'number') {
      throw new Error('Invalid response from OpenAI API: Missing required fields');
    }
    
    // Fix generic name if needed
    let betterName = result.name;
    if (betterName === "Overall food description" || betterName === "Food description" || betterName === "Meal") {
      if (Array.isArray(result.components) && result.components.length > 0) {
  const componentNames = result.components.map((c: { name: string }) => c.name).filter(Boolean);
        if (componentNames.length > 0) {
          betterName = componentNames.slice(0, 3).join(' with ');
          console.log('Generated better name from components:', betterName);
          
          // Update the name in the result
          result.name = betterName;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('[Vision API] Error analyzing food text:', error);
    throw error;
  }
}

/**
 * Analyze food from image using the backend API
 */
export async function analyzeFoodImage(base64Image: string): Promise<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
  components?: Array<{
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
  console.log('Analyzing food image with Vision API...');
  
  try {
    const response = await fetch('/api/analyze-food-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to analyze image (${response.status})`);
    }
    
    const result = await response.json();
    console.log('Vision API food image analysis complete, result:', result);
    
    // Ensure all required fields are present
    if (!result || typeof result.name !== 'string' || typeof result.calories !== 'number') {
      throw new Error('Invalid response from Vision API: Missing required fields');
    }
    
    return result;
  } catch (error) {
    console.error('[Vision API] Error analyzing food image:', error);
    throw error;
  }
}
