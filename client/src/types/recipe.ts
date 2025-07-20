export interface Recipe {
  id: number;
  name: string;
  description?: string;
  nutritionInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: string[];
  instructions: string | string[];
  isPublic: boolean;
  createdAt: string;
  imageUrl?: string;
  prepTime?: number;
  cookingTime?: number;
  difficulty?: string;
  cuisine?: string;
  mealType?: string;
}