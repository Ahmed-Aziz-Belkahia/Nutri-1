/**
 * Android WebView Bridge Utility
 * 
 * This file provides functions to communicate with the Android native app through
 * the NutriAIAndroid JavaScript interface exposed in the WebView.
 */

interface NutriAIState {
  goal: 'cutting' | 'bulking' | 'maintaining';
  caloriesTarget: number;
  caloriesEaten: number;
  mealsLoggedToday: number;
  weightTrend: 'gaining' | 'losing' | 'stable';
  streakDays: number;
  lastActiveDate: string;
  userName?: string;
}

// Check if the Android interface is available
const isAndroidBridgeAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof (window as any).NutriAIAndroid !== 'undefined' && 
         typeof (window as any).NutriAIAndroid.updateState === 'function';
};

// Get default values or from localStorage if available
const getDefaultState = (): NutriAIState => {
  const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
  
  // Try to get values from localStorage if available
  const goal = localStorage.getItem('nutriai_goal') || 'cutting';
  const caloriesTarget = parseInt(localStorage.getItem('nutriai_calories_target') || '2000', 10);
  const caloriesEaten = parseInt(localStorage.getItem('nutriai_calories_eaten') || '0', 10);
  const mealsLoggedToday = parseInt(localStorage.getItem('nutriai_meals_logged') || '0', 10);
  const weightTrend = localStorage.getItem('nutriai_weight_trend') || 'stable';
  const streakDays = parseInt(localStorage.getItem('nutriai_streak_days') || '0', 10);
  const userName = localStorage.getItem('nutriai_user_name') || undefined;
  
  return {
    goal: goal as 'cutting' | 'bulking' | 'maintaining',
    caloriesTarget,
    caloriesEaten,
    mealsLoggedToday,
    weightTrend: weightTrend as 'gaining' | 'losing' | 'stable',
    streakDays,
    lastActiveDate: today,
    userName
  };
};

/**
 * Update the Android app state
 * This will silently call the NutriAIAndroid.updateState method if available,
 * or just log to console in development/web environments
 */
export const updateAndroidState = (stateUpdate: Partial<NutriAIState>): void => {
  // Get current state or defaults
  const currentState = getDefaultState();
  
  // Create new state by merging current with updates
  const newState: NutriAIState = {
    ...currentState,
    ...stateUpdate,
    // Always update lastActiveDate to today
    lastActiveDate: new Date().toISOString().split('T')[0]
  };
  
  // Store values in localStorage for persistence and for web fallback
  localStorage.setItem('nutriai_goal', newState.goal);
  localStorage.setItem('nutriai_calories_target', newState.caloriesTarget.toString());
  localStorage.setItem('nutriai_calories_eaten', newState.caloriesEaten.toString());
  localStorage.setItem('nutriai_meals_logged', newState.mealsLoggedToday.toString());
  localStorage.setItem('nutriai_weight_trend', newState.weightTrend);
  localStorage.setItem('nutriai_streak_days', newState.streakDays.toString());
  if (newState.userName) {
    localStorage.setItem('nutriai_user_name', newState.userName);
  }
  
  // Log state changes in development with proper object formatting
  console.log('State update:', JSON.stringify(newState, null, 2));
  
  // Send to Android if bridge is available
  if (isAndroidBridgeAvailable()) {
    try {
      (window as any).NutriAIAndroid.updateState(JSON.stringify(newState));
      console.log('Android state updated successfully');
    } catch (error) {
      console.error('Error updating Android state:', error);
    }
  } else {
    console.log('Android bridge not available, running in web mode');
  }
};

/**
 * Update state when food is logged
 */
export const updateStateOnFoodLogged = (
  calories: number, 
  mealName: string, 
  protein: number, 
  carbs: number,
  fat: number
): void => {
  // Get current state
  const currentState = getDefaultState();
  
  // Update state
  updateAndroidState({
    caloriesEaten: currentState.caloriesEaten + calories,
    mealsLoggedToday: currentState.mealsLoggedToday + 1
  });
  
  console.log(`Food logged: ${mealName} (${calories} calories, P:${protein}g, C:${carbs}g, F:${fat}g)`);
};

/**
 * Update state when meal plan is completed
 */
export const updateStateOnMealCompleted = (mealName: string, calories: number): void => {
  updateAndroidState({
    caloriesEaten: getDefaultState().caloriesEaten + calories
  });
  
  console.log(`Meal completed: ${mealName} (${calories} calories)`);
};

/**
 * Update state when weight is updated
 */
export const updateStateOnWeightUpdate = (
  newWeight: number, 
  previousWeight: number, 
  goalWeight: number
): void => {
  // Determine weight trend
  let weightTrend: 'gaining' | 'losing' | 'stable' = 'stable';
  
  if (newWeight > previousWeight) {
    weightTrend = 'gaining';
  } else if (newWeight < previousWeight) {
    weightTrend = 'losing';
  }
  
  // Determine goal based on weight relationship to goal weight
  let goal: 'cutting' | 'bulking' | 'maintaining' = 'maintaining';
  
  if (newWeight > goalWeight) {
    goal = 'cutting';
  } else if (newWeight < goalWeight) {
    goal = 'bulking';
  }
  
  updateAndroidState({
    weightTrend,
    goal
  });
  
  console.log(`Weight updated: ${newWeight}kg (previous: ${previousWeight}kg, goal: ${goalWeight}kg)`);
};

/**
 * Update state when user completes setup or changes goals
 */
export const updateStateOnGoalChange = (
  goal: 'cutting' | 'bulking' | 'maintaining',
  caloriesTarget: number,
  userName?: string
): void => {
  updateAndroidState({
    goal,
    caloriesTarget,
    userName
  });
  
  console.log(`Goal updated: ${goal} (${caloriesTarget} calories target)`);
};

/**
 * Update state when streak changes (login, completing daily goals, etc.)
 */
export const updateStateOnStreakChange = (streakDays: number): void => {
  updateAndroidState({
    streakDays
  });
  
  console.log(`Streak updated: ${streakDays} days`);
};

/**
 * Update state when recipes are generated from scan
 */
export const updateStateOnRecipeGenerated = (recipeCount: number): void => {
  console.log(`Recipes generated: ${recipeCount}`);
  // No specific state update required, but could track recipe generation metrics
};

/**
 * Update state when recipes are saved
 */
export const updateStateOnRecipeSaved = (recipeName: string): void => {
  console.log(`Recipe saved: ${recipeName}`);
  // No specific state update required, but could track recipe saving metrics
};

/**
 * Initialize state from user profile data
 */
export const initializeStateFromUserProfile = (
  profile: any,
  dailyLogs: any,
  streakCount: number
): void => {
  if (!profile) return;
  
  const userName = profile.name || undefined;
  const caloriesTarget = profile.calorieGoal || 2000;
  const caloriesEaten = dailyLogs?.calories || 0;
  const mealsLoggedToday = dailyLogs?.mealCount || 0;
  
  let goal: 'cutting' | 'bulking' | 'maintaining' = 'maintaining';
  let weightTrend: 'gaining' | 'losing' | 'stable' = 'stable';
  
  // Determine goal from weight goals
  if (profile.currentWeight > profile.goalWeight) {
    goal = 'cutting';
  } else if (profile.currentWeight < profile.goalWeight) {
    goal = 'bulking';
  }
  
  // Determine weight trend from recent logs if available
  if (profile.recentWeightChange > 0) {
    weightTrend = 'gaining';
  } else if (profile.recentWeightChange < 0) {
    weightTrend = 'losing';
  }
  
  updateAndroidState({
    userName,
    goal,
    caloriesTarget,
    caloriesEaten,
    mealsLoggedToday,
    weightTrend,
    streakDays: streakCount
  });
  
  console.log('Initialized state from user profile');
};

/**
 * Send nutrition state updates to Android WebView app.
 * This function is called after a meal is logged and only sends data if the user is authenticated.
 * 
 * @param {object} userData - The authenticated user's data
 * @param {object} profileData - The user's nutrition profile data
 * @param {object} dailyLogs - The user's daily food logs
 * @param {number} streakCount - The user's current streak count
 * @returns {boolean} - Whether the update was sent successfully
 */
export const sendAndroidNutritionState = (
  userData: any,
  profileData: any,
  dailyLogs: any,
  streakCount: number
): boolean => {
  // Check if user is logged in
  if (!userData || !userData.id) {
    console.log('Cannot send nutrition state: User not logged in');
    return false;
  }

  // Get username from email or use default
  const userName = userData.email ? userData.email.split('@')[0] : 'User';
  
  // Determine goal based on current and target weight
  let goal: 'lose' | 'gain' | 'maintain' = 'maintain';
  if (profileData?.currentWeight && profileData?.goalWeight) {
    const currentWeight = parseFloat(profileData.currentWeight.toString());
    const goalWeight = parseFloat(profileData.goalWeight.toString());
    
    if (currentWeight > goalWeight) {
      goal = 'lose';
    } else if (currentWeight < goalWeight) {
      goal = 'gain';
    }
  }
  
  // Determine weight trend from recent logs
  let weightTrend: 'up' | 'down' | 'stable' = 'stable';
  if (profileData?.recentWeightChange) {
    const recentChange = parseFloat(profileData.recentWeightChange.toString());
    if (recentChange > 0) {
      weightTrend = 'up';
    } else if (recentChange < 0) {
      weightTrend = 'down';
    }
  }
  
  // Get calorie targets and consumption
  const caloriesTarget = profileData?.calorieGoal || profileData?.caloriesGoal || 2000;
  const caloriesEaten = dailyLogs?.totals?.calories || 0;
  const mealsLoggedToday = dailyLogs?.logs?.length || 0;
  
  // Format date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Create the state object to send to Android
  const nutritionState = {
    goal,
    caloriesTarget,
    caloriesEaten,
    mealsLoggedToday,
    streakDays: streakCount,
    weightTrend,
    userName,
    lastActiveDate: today
  };
  
  console.log('Sending nutrition state to Android:', JSON.stringify(nutritionState, null, 2));
  
  // Send to Android if bridge is available
  if (isAndroidBridgeAvailable()) {
    try {
      (window as any).NutriAIAndroid.updateState(JSON.stringify(nutritionState));
      console.log('Android nutrition state updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating Android nutrition state:', error);
      return false;
    }
  } else {
    console.log('Android bridge not available, running in web mode');
    return false;
  }
};

export default {
  updateAndroidState,
  updateStateOnFoodLogged,
  updateStateOnMealCompleted,
  updateStateOnWeightUpdate,
  updateStateOnGoalChange,
  updateStateOnStreakChange,
  updateStateOnRecipeGenerated,
  updateStateOnRecipeSaved,
  initializeStateFromUserProfile,
  sendAndroidNutritionState
};