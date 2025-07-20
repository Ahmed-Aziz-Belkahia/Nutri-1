export interface OnboardingData {
  age: number;
  height: number;
  weight: number;
  goalWeight: number;
  activityLevel: string;
  dietaryPreferences: string;
  gender: string;
  calorieGoal?: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
}

export interface FoodEntry {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  image?: string;
}

export interface WaterEntry {
  id: number;
  amount: number;
  date: string;
}

export interface WeightEntry {
  id: number;
  weight: number;
  date: string;
}

export interface MacroGoals {
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyProgress {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  waterAmount: number;
}
