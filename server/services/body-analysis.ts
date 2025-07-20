import { OpenAI } from 'openai';
import { z } from 'zod';

// Initialize OpenAI client with configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout - reduced from 60 seconds
  maxRetries: 1,  // Reduced retries to speed up error responses
});

// Schema for body analysis response
export const BodyAnalysisSchema = z.object({
  bodyFatPercentage: z.number(),
  bodyType: z.string(),
  muscleMass: z.string().optional(),
  bodyCompositionNotes: z.string().optional(),
  improvementSuggestions: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(100),
});

export type BodyAnalysis = z.infer<typeof BodyAnalysisSchema>;

/**
 * Analyzes a body image to estimate body fat percentage and provide feedback
 * 
 * @param imageBase64 Base64 encoded image data
 * @param weight User's weight in kg
 * @param height User's height in cm
 * @param gender User's gender (optional)
 * @param age User's age (optional)
 * @returns Body analysis data
 */
export async function analyzeBodyComposition(
  imageBase64: string,
  weight: number,
  height: number,
  gender: 'male' | 'female' = 'male',
  age: number = 30
): Promise<BodyAnalysis> {
  try {
    // Calculate BMI for reference
    const bmi = weight / Math.pow(height / 100, 2);

    // Prompt engineering for better results
    const systemPrompt = `
      You are a fitness and nutrition assistant that provides hypothetical assessments based on given parameters.
      The user will show an image of a physique and ask you to estimate what body composition metrics MIGHT be 
      associated with SIMILAR physiques (not the specific person in the image).
      
      When responding, DO NOT analyze the specific person in the image.
      
      Instead, consider these general parameters as a starting point:
      - Weight: ${weight} kg
      - Height: ${height} cm
      - BMI: ${bmi.toFixed(1)}
      - Gender category: ${gender}
      - Age category: ${age}
      
      Based on the image showing a SIMILAR physique to what you might find in fitness reference materials,
      provide a hypothetical assessment of what typical body composition values might be for someone with 
      that general body structure. Use your knowledge of fitness and health to make educated assessments.
      
      IMPORTANT: Your response must ONLY contain a valid JSON object without any additional text, markdown, or explanation. 
      The JSON object must include these fields:
      {
        "bodyFatPercentage": number,
        "bodyType": string,
        "muscleMass": string,
        "bodyCompositionNotes": string,
        "improvementSuggestions": string[],
        "confidence": number
      }
      
      Where:
      - bodyFatPercentage: Hypothetical body fat percentage range (number between 3-50)
      - bodyType: General body type classification ("Ectomorph", "Mesomorph", or "Endomorph")
      - muscleMass: General assessment of typical muscle mass ("Low", "Moderate", or "High")
      - bodyCompositionNotes: Brief notes on general body composition patterns
      - improvementSuggestions: Array of 2-3 general suggestions applicable to this body type
      - confidence: Confidence level in assessment (number between 0-100)
    `;

    // Check if image is valid
    if (!imageBase64 || !imageBase64.includes('base64')) {
      console.error('Invalid image format provided for analysis');
      throw new Error('Invalid image format');
    }

    // Process image with OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: "What would be the general fitness metrics for someone with a physique similar to what's shown in this reference image? Please provide the JSON with hypothetical metrics only, not a direct analysis of any individual." },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 800,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No analysis content returned');
    }

    // Extract JSON from the response
    // Try different approaches to parse JSON from the content
    let analysisData;
    try {
      // First try direct JSON parsing
      try {
        analysisData = JSON.parse(content);
      } catch (e) {
        // If direct parsing fails, try to extract JSON with regex
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid analysis format returned');
        }
        analysisData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse analysis JSON:', parseError);
      console.log('Raw content from OpenAI:', content);
      throw new Error('Failed to parse body analysis data');
    }
    
    // Validate with Zod
    const validatedData = BodyAnalysisSchema.parse(analysisData);
    
    // Translate some common improvement suggestions to Polish if needed
    if (validatedData.improvementSuggestions && validatedData.improvementSuggestions.length > 0) {
      // In a real app with proper i18n on the server side, we would use an i18n library
      // For now, we'll just manually replace common English suggestions with Polish ones
      validatedData.improvementSuggestions = validatedData.improvementSuggestions.map(suggestion => {
        if (suggestion.includes('strength training') || suggestion.includes('resistance training')) {
          return "Włącz trening siłowy 3-4 razy w tygodniu, aby poprawić definicję mięśni.";
        } else if (suggestion.includes('cardio') || suggestion.includes('aerobic')) {
          return "Zwiększ sesje kardio, aby pomóc zmniejszyć procent tkanki tłuszczowej.";
        } else if (suggestion.includes('balanced diet') || suggestion.includes('protein')) {
          return "Utrzymuj zbilansowaną dietę koncentrującą się na białku, aby wspierać wzrost mięśni.";
        } else if (suggestion.includes('consistency') || suggestion.includes('regular')) {
          return "Zachowaj konsekwencję w treningu, aby uzyskać najlepsze rezultaty.";
        } else if (suggestion.includes('rest') || suggestion.includes('recovery')) {
          return "Pamiętaj o odpowiednim odpoczynku, aby umożliwić regenerację mięśni.";
        } else if (suggestion.includes('water') || suggestion.includes('hydration')) {
          return "Pij więcej wody, aby wspierać metabolizm i regenerację.";
        } else if (suggestion.includes('protein intake')) {
          return "Zwiększ spożycie białka w celu wsparcia regeneracji mięśni.";
        } else if (suggestion.includes('stretching') || suggestion.includes('flexibility')) {
          return "Dodaj regularne stretching, aby poprawić zakres ruchu.";
        }
        return suggestion;
      });
    }
    
    return validatedData;
  } catch (error: any) {
    console.error('Body analysis error:', error);
    
    // Check if it's an OpenAI rate limit error
    const isRateLimit = error?.toString?.().includes('429') || 
                        error?.toString?.().includes('rate limit') || 
                        error?.toString?.().includes('quota');
    
    // Check if it's an OpenAI connection error
    const isConnectionError = error?.toString?.().includes('ECONNREFUSED') || 
                              error?.toString?.().includes('connect ETIMEDOUT') ||
                              error?.toString?.().includes('network error');
    
    // Fallback to BMI-based estimate if API fails
    const bmi = weight / Math.pow(height / 100, 2);
    
    let estimatedBodyFat;
    if (gender === 'male') {
      estimatedBodyFat = (1.20 * bmi) + (0.23 * age) - 16.2;
    } else {
      estimatedBodyFat = (1.20 * bmi) + (0.23 * age) - 5.4;
    }
    
    // Determine message based on gender for more accurate translation and Polish grammar
    const bodyTypeInPolish = bmi < 18.5 ? "Ektomorf" : bmi < 25 ? "Mezomorf" : "Endomorf";
    
    // Customize message based on error type
    let errorMessage = "Analiza oparta na obliczeniach BMI (analiza zdjęcia nie powiodła się)";
    let suggestions = ["Spróbuj ponownie z wyraźniejszym zdjęciem całego ciała"];
    
    if (isRateLimit) {
      errorMessage = "Analiza oparta na obliczeniach BMI. Limit API został przekroczony.";
      suggestions = [
        "Spróbuj ponownie za kilka minut",
        "Użyj wyraźnego zdjęcia całego ciała w dobrym oświetleniu"
      ];
    } else if (isConnectionError) {
      errorMessage = "Analiza oparta na obliczeniach BMI. Problem z połączeniem z serwisem.";
      suggestions = [
        "Sprawdź swoje połączenie z internetem",
        "Spróbuj ponownie za kilka minut"
      ];
    } else if (error?.toString?.().includes('Invalid analysis format')) {
      errorMessage = "Analiza oparta na obliczeniach BMI. Nie udało się przetworzyć zdjęcia.";
      suggestions = [
        "Użyj zdjęcia całego ciała w dobrym oświetleniu",
        "Upewnij się, że jesteś dobrze widoczny na zdjęciu"
      ];
    } else if (error?.toString?.().includes('Failed to parse')) {
      errorMessage = "Analiza oparta na obliczeniach BMI. Nieprawidłowy format odpowiedzi.";
      suggestions = [
        "Spróbuj użyć innego zdjęcia",
        "Upewnij się, że na zdjęciu widać całe ciało"
      ];
    }
    
    // For debugging purposes, log the error
    console.log("Body analysis using fallback with error message:", errorMessage);
    
    return {
      bodyFatPercentage: Math.round(estimatedBodyFat * 10) / 10,
      bodyType: bodyTypeInPolish,
      bodyCompositionNotes: errorMessage,
      improvementSuggestions: suggestions,
      confidence: 40,
      muscleMass: gender === 'male' ? "Umiarkowana" : "Umiarkowana"
    };
  }
}