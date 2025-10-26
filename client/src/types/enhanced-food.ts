/**
 * Enhanced Food Analysis Types
 * Unified types for food logs that can also be recipes
 */

export interface Ingredient {
  name: string;
  quantity: number | string;
  unit: string;
  calories?: number;
}

export interface FoodComponent {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  quantity?: number;
  details?: any;
}

/**
 * Enhanced food analysis result from AI vision
 * Includes both simple food log data and optional recipe data
 */
export interface EnhancedFoodAnalysis {
  // Core nutrition data (required)
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  
  // Component breakdown (from AI analysis)
  components?: FoodComponent[];
  
  // Image data
  image?: string;
  imageUrl?: string;
  
  // Recipe-like fields (optional, populated when AI recognizes a recipe)
  description?: string;
  ingredients?: Ingredient[];
  instructions?: string[];
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  servings?: number;
  
  // Metadata
  source?: 'scanned' | 'manual' | 'ai-generated';
  isRecipe?: boolean;
  cuisineType?: string; // 'Italian', 'Mexican', 'American', etc.
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[]; // ['vegetarian', 'gluten-free', 'low-carb', etc.]
  
  // Confidence metrics (from AI)
  confidence?: number;
}

/**
 * Food log with recipe data (database model)
 */
export interface FoodLogWithRecipe {
  id: number;
  userId: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: Date | string;
  
  // Optional fields
  image?: string;
  imageUrl?: string;
  components?: FoodComponent[];
  
  // Recipe fields
  description?: string;
  ingredients?: Ingredient[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  source?: string;
  isRecipe?: boolean;
  recipeId?: number;
  cuisineType?: string;
  mealType?: string;
  difficulty?: string;
  tags?: string[];
}
