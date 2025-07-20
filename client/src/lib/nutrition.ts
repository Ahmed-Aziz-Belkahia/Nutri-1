// Calculates Base Metabolic Rate (BMR) using Mifflin-St Jeor Equation
function calculateBMR(age: number, weight: number, height: number, isMale: boolean = true): number {
  const baseCalories = 10 * weight + 6.25 * height - 5 * age;
  return isMale ? baseCalories + 5 : baseCalories - 161;
}

// Get activity level multiplier
function getActivityMultiplier(activityLevel: string): number {
  const multipliers = {
    sedentary: 1.2, // Little or no exercise
    light: 1.375, // Light exercise/sports 1-3 days/week
    moderate: 1.55, // Moderate exercise/sports 3-5 days/week
    active: 1.725, // Hard exercise/sports 6-7 days/week
  };
  return multipliers[activityLevel as keyof typeof multipliers] || 1.2;
}

// Calculate daily calorie needs
export function calculateDailyCalories(
  age: number,
  weight: number,
  height: number,
  activityLevel: string,
  goalType: 'maintain' | 'lose' | 'gain' = 'maintain',
): number {
  const bmr = calculateBMR(age, weight, height);
  const maintenanceCalories = Math.round(bmr * getActivityMultiplier(activityLevel));
  
  // Adjust calories based on goal
  switch (goalType) {
    case 'lose':
      return Math.round(maintenanceCalories * 0.8); // 20% deficit
    case 'gain':
      return Math.round(maintenanceCalories * 1.15); // 15% surplus
    default:
      return maintenanceCalories;
  }
}

// Calculate macro splits based on calorie goal
export function calculateMacros(dailyCalories: number) {
  return {
    protein: Math.round((dailyCalories * 0.3) / 4), // 30% of calories, 4 calories per gram
    carbs: Math.round((dailyCalories * 0.5) / 4),   // 50% of calories, 4 calories per gram
    fat: Math.round((dailyCalories * 0.2) / 9),     // 20% of calories, 9 calories per gram
  };
}

// Calculate time to reach goal weight based on calorie deficit/surplus
export function calculateTimeToGoal(
  currentWeight: number,
  goalWeight: number,
  maintenanceCalories: number,
  adjustedCalories: number
): { weeks: number; description: string } {
  const weightDiff = Math.abs(goalWeight - currentWeight);
  const calorieAdjustment = Math.abs(adjustedCalories - maintenanceCalories);
  
  // 7700 calories = 1 kg of body weight
  // Calculate daily weight change based on calorie adjustment
  const dailyWeightChange = calorieAdjustment / 7700;
  
  // Calculate days needed to reach goal
  const daysToGoal = weightDiff / dailyWeightChange;
  const weeksToGoal = Math.ceil(daysToGoal / 7);
  
  const action = goalWeight > currentWeight ? "gain" : "lose";
  const description = `It will take approximately ${weeksToGoal} weeks to ${action} ${weightDiff.toFixed(1)} kg at your current rate.`;
  
  return { weeks: weeksToGoal, description };
}
