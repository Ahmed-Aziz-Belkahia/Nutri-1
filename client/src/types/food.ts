export interface FoodComponentDetails {
  type?: string;
  preparation?: string;
  texture?: string;
  estimatedWeight?: string;
  cookingMethod?: string;
  doneness?: string;
  temperature?: string;
  color?: string;
  presentation?: string;
  seasonings?: string[];
  garnishes?: string[];
  [key: string]: any;
}

export interface FoodComponent {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  quantity?: number;
  details?: FoodComponentDetails;
}

export interface Meal {
  id: number;
  name: string;
  date: string;
  image?: string;
  calories: string | number;
  protein: string | number;
  carbs: string | number;
  fat: string | number;
  components?: FoodComponent[];
}