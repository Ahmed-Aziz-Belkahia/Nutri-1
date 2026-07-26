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
    formula: "Mifflin-St Jeor Equation",
    source: "American Dietetic Association (2005)"
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

// Calculates Base Metabolic Rate (BMR) using Mifflin-St Jeor Equation (most commonly used)
function calculateBMR(age: number, weight: number, height: number, isMale: boolean = true): number {
  // Mifflin-St Jeor: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + s
  // where s is +5 for males and -161 for females
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

// 1 kg of body weight ≈ 7700 kcal (Hall et al., 2011)
const KCAL_PER_KG = 7700;

/**
 * Absolute floors, below which a target is not safe to present.
 * NHS and EFSA both treat sustained intake under these levels as requiring
 * medical supervision, so the app must never generate one on its own.
 */
const MIN_CALORIES_MALE = 1500;
const MIN_CALORIES_FEMALE = 1200;

/** Fastest surplus we will suggest; beyond this the gain is mostly fat. */
const MAX_SURPLUS_PER_DAY = 500;

export interface CalorieTarget {
  /** The number to show the user. */
  calories: number;
  /** TDEE before any goal adjustment. */
  maintenance: number;
  /** Signed daily adjustment actually applied, after clamping. */
  adjustment: number;
  /** True when the requested pace was reduced to stay above the floor. */
  wasFloored: boolean;
  /** Pace actually achievable after flooring, kg/week. */
  effectivePacePerWeek: number;
}

/**
 * Daily calorie target for a goal and a chosen pace.
 *
 * `paceKgPerWeek` is the rate the user picked on the onboarding speed slider.
 * Previously this was ignored and a flat -500/+300 was applied, so every user
 * saw the same target no matter which pace they chose — the personalised plan
 * was not personalised. The deficit is now derived from the pace, then floored
 * so an aggressive slider can never produce an unsafe number.
 */
export function calculateCalorieTarget(
  age: number,
  weight: number,
  height: number,
  activityLevel: string,
  goalType: 'maintain' | 'lose' | 'gain' = 'maintain',
  isMale: boolean = true,
  paceKgPerWeek: number = 0.5
): CalorieTarget {
  const bmr = calculateBMR(age, weight, height, isMale);
  const maintenance = Math.round(bmr * getActivityMultiplier(activityLevel));

  if (goalType === 'maintain') {
    return {
      calories: maintenance,
      maintenance,
      adjustment: 0,
      wasFloored: false,
      effectivePacePerWeek: 0
    };
  }

  const pace = Math.abs(paceKgPerWeek) || 0.5;
  const requestedDelta = Math.round((pace * KCAL_PER_KG) / 7);

  if (goalType === 'gain') {
    const surplus = Math.min(requestedDelta, MAX_SURPLUS_PER_DAY);
    return {
      calories: maintenance + surplus,
      maintenance,
      adjustment: surplus,
      wasFloored: surplus < requestedDelta,
      effectivePacePerWeek: (surplus * 7) / KCAL_PER_KG
    };
  }

  // Losing: never take the target below the absolute floor, and never below
  // BMR — eating under your resting requirement is not something to suggest.
  const floor = Math.max(isMale ? MIN_CALORIES_MALE : MIN_CALORIES_FEMALE, Math.round(bmr));
  const target = Math.max(maintenance - requestedDelta, floor);
  const deficit = maintenance - target;

  return {
    calories: target,
    maintenance,
    adjustment: -deficit,
    wasFloored: deficit < requestedDelta,
    effectivePacePerWeek: (deficit * 7) / KCAL_PER_KG
  };
}

/**
 * Backwards-compatible wrapper returning just the calorie number.
 * Existing callers (AuthPage, ProfileNew) keep working unchanged.
 */
export function calculateDailyCalories(
  age: number,
  weight: number,
  height: number,
  activityLevel: string,
  goalType: 'maintain' | 'lose' | 'gain' = 'maintain',
  isMale: boolean = true,
  paceKgPerWeek: number = 0.5
): number {
  return calculateCalorieTarget(age, weight, height, activityLevel, goalType, isMale, paceKgPerWeek).calories;
}

// Calculate macro splits based on calorie goal and weight goal
// Uses goal-specific ratios backed by nutrition science
export function calculateMacros(
  dailyCalories: number, 
  goalType: 'maintain' | 'lose' | 'gain' = 'maintain'
) {
  let proteinRatio: number, carbRatio: number, fatRatio: number;

  switch (goalType) {
    case 'lose':
      // Higher protein for muscle preservation, moderate fat for satiety
      proteinRatio = 0.30; // 30% protein
      carbRatio = 0.35;    // 35% carbs
      fatRatio = 0.35;     // 35% fat
      break;
    case 'gain':
      // Higher carbs to support muscle building and training
      proteinRatio = 0.25; // 25% protein
      carbRatio = 0.45;    // 45% carbs
      fatRatio = 0.30;     // 30% fat
      break;
    default:
      // Balanced maintenance ratios
      proteinRatio = 0.25; // 25% protein
      carbRatio = 0.40;    // 40% carbs
      fatRatio = 0.35;     // 35% fat
  }

  return {
    protein: Math.round((dailyCalories * proteinRatio) / 4), // 4 calories per gram
    carbs: Math.round((dailyCalories * carbRatio) / 4),       // 4 calories per gram
    fat: Math.round((dailyCalories * fatRatio) / 9),          // 9 calories per gram
  };
}

/**
 * Projected date of reaching the goal weight at the effective pace.
 *
 * The results screen previously hardcoded "today + 84 days" for everyone,
 * which contradicted both the goal weight and the pace the user chose.
 * Returns null when there is nothing to project (maintaining, already at
 * goal, or a pace that was floored to zero).
 */
export function calculateGoalDate(
  currentWeightKg: number,
  goalWeightKg: number,
  effectivePacePerWeek: number,
  from: Date = new Date()
): { date: Date; weeks: number } | null {
  const delta = Math.abs(goalWeightKg - currentWeightKg);
  if (delta < 0.1 || effectivePacePerWeek <= 0) return null;

  const weeks = Math.ceil(delta / effectivePacePerWeek);
  const date = new Date(from);
  date.setDate(date.getDate() + weeks * 7);
  return { date, weeks };
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
