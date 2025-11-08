// Medical and scientific sources for nutrition calculations
export const NUTRITION_SOURCES = [
  {
    title: "WHO/FAO/UNU Energy Requirements",
    organization: "World Health Organization (WHO)",
    url: "https://www.who.int/nutrition/publications/nutrientrequirements/9241209356/en/",
    description: "Expert consultation on human energy requirements (2004)"
  },
  {
    title: "Physical Activity Guidelines",
    organization: "World Health Organization (WHO)",
    url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    description: "Guidelines for physical activity levels and energy expenditure"
  },
  {
    title: "Dietary Guidelines for Americans",
    organization: "U.S. Department of Health and Human Services",
    url: "https://www.dietaryguidelines.gov/",
    description: "Evidence-based recommendations for macronutrient distribution"
  },
  {
    title: "Energy Requirements and Body Weight",
    organization: "European Food Safety Authority (EFSA)",
    url: "https://www.efsa.europa.eu/en/topics/topic/nutrition",
    description: "Scientific guidance on energy requirements and weight management"
  }
];

export const CALCULATION_METHODS = [
  {
    method: "Basal Metabolic Rate (BMR)",
    formula: "WHO/FAO/UNU equations by age and gender",
    source: "WHO Technical Report Series 935 (2004)"
  },
  {
    method: "Total Daily Energy Expenditure (TDEE)",
    formula: "TDEE = BMR × Activity Factor",
    source: "Institute of Medicine Dietary Reference Intakes"
  },
  {
    method: "Weight Loss/Gain Calculation",
    formula: "1 kg body weight ≈ 7700 calories",
    source: "Hall et al. (2011) The Lancet"
  }
];

// Calculates Base Metabolic Rate (BMR) using WHO/FAO/UNU Equations (more accurate than Mifflin-St Jeor)
function calculateBMR(age: number, weight: number, height: number, isMale: boolean = true): number {
  // WHO equations use weight in kg, height in cm, and return kcal/day
  if (isMale) {
    if (age >= 18 && age <= 29) {
      return (15.057 * weight) + (1.004 * height) + 705;
    } else if (age >= 30 && age <= 59) {
      return (11.472 * weight) + (8.73 * height) + 873;
    } else if (age >= 60) {
      return (11.711 * weight) + (5.878 * height) + 587;
    }
  } else { // female
    if (age >= 18 && age <= 29) {
      return (14.818 * weight) + (4.65 * height) + 486;
    } else if (age >= 30 && age <= 59) {
      return (8.126 * weight) + (8.45 * height) + 845;
    } else if (age >= 60) {
      return (9.082 * weight) + (6.588 * height) + 658;
    }
  }
  // Fallback to Mifflin-St Jeor if age is outside ranges
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
    very_active: 1.9, // Very hard exercise/sports & physical job
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
  isMale: boolean = true
): number {
  const bmr = calculateBMR(age, weight, height, isMale);
  const maintenanceCalories = Math.round(bmr * getActivityMultiplier(activityLevel));
  
  // Adjust calories based on goal (using WHO recommended deficits/surpluses)
  switch (goalType) {
    case 'lose':
      return Math.round(maintenanceCalories - 500); // 500 kcal deficit for ~0.5kg/week loss
    case 'gain':
      return Math.round(maintenanceCalories + 300); // 300 kcal surplus for lean mass gain
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
