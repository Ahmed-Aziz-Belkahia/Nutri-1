// Fast meal plan generator using pre-defined templates
// This replaces the slow OpenAI generation for better user experience

interface MealTemplate {
  name: string;
  mealType: string;
  recipe: {
    ingredients: string[];
    instructions: string[];
    prepTime: number;
    nutritionInfo: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

// Expanded meal templates for variety
const englishMealTemplates: MealTemplate[] = [
  // Breakfast options (7 different)
  {
    name: "Scrambled Eggs with Tomatoes",
    mealType: "breakfast",
    recipe: {
      ingredients: ["3 eggs", "1 tomato", "butter", "salt", "pepper"],
      instructions: ["Sauté tomato in butter", "Add beaten eggs", "Cook while stirring"],
      prepTime: 10,
      nutritionInfo: { calories: 280, protein: 18, carbs: 6, fat: 20 }
    }
  },
  {
    name: "Oatmeal with Fruits",
    mealType: "breakfast", 
    recipe: {
      ingredients: ["50g oats", "200ml milk", "1 banana", "honey"],
      instructions: ["Pour milk over oats", "Add sliced banana", "Drizzle with honey"],
      prepTime: 5,
      nutritionInfo: { calories: 320, protein: 12, carbs: 55, fat: 6 }
    }
  },
  {
    name: "Avocado Toast",
    mealType: "breakfast",
    recipe: {
      ingredients: ["2 slices bread", "1 avocado", "salt", "pepper", "lemon"],
      instructions: ["Toast bread", "Mash avocado with salt", "Spread on toast"],
      prepTime: 8,
      nutritionInfo: { calories: 350, protein: 8, carbs: 35, fat: 22 }
    }
  },
  {
    name: "Cheese Omelet",
    mealType: "breakfast",
    recipe: {
      ingredients: ["3 eggs", "50g yellow cheese", "butter", "chives"],
      instructions: ["Beat eggs", "Cook omelet", "Add cheese and chives"],
      prepTime: 12,
      nutritionInfo: { calories: 380, protein: 25, carbs: 3, fat: 28 }
    }
  },
  {
    name: "Ham Sandwiches",
    mealType: "breakfast",
    recipe: {
      ingredients: ["2 slices bread", "100g ham", "butter", "cucumber", "tomato"],
      instructions: ["Spread bread with butter", "Add ham", "Garnish with vegetables"],
      prepTime: 5,
      nutritionInfo: { calories: 320, protein: 20, carbs: 25, fat: 15 }
    }
  },
  {
    name: "Cereal with Yogurt",
    mealType: "breakfast",
    recipe: {
      ingredients: ["40g corn flakes", "150ml yogurt", "berries", "honey"],
      instructions: ["Pour yogurt over cereal", "Add berries", "Drizzle with honey"],
      prepTime: 3,
      nutritionInfo: { calories: 290, protein: 10, carbs: 45, fat: 8 }
    }
  },
  {
    name: "Cold Cheesecake",
    mealType: "breakfast",
    recipe: {
      ingredients: ["200g cottage cheese", "1 tbsp honey", "nuts", "cinnamon"],
      instructions: ["Mix cottage cheese with honey", "Add nuts", "Sprinkle with cinnamon"],
      prepTime: 5,
      nutritionInfo: { calories: 340, protein: 28, carbs: 15, fat: 18 }
    }
  },
  
  // Lunch options
  {
    name: "Chicken Salad",
    mealType: "lunch",
    recipe: {
      ingredients: ["150g chicken breast", "lettuce", "tomato", "cucumber", "olive oil"],
      instructions: ["Cook chicken", "Chop vegetables", "Mix with olive oil"],
      prepTime: 15,
      nutritionInfo: { calories: 380, protein: 35, carbs: 8, fat: 24 }
    }
  },
  {
    name: "Pasta with Tomato Sauce",
    mealType: "lunch",
    recipe: {
      ingredients: ["80g pasta", "150ml tomato sauce", "parmesan", "basil"],
      instructions: ["Cook pasta", "Heat sauce", "Mix with parmesan"],
      prepTime: 12,
      nutritionInfo: { calories: 420, protein: 16, carbs: 65, fat: 12 }
    }
  },
  {
    name: "Tomato Soup with Rice",
    mealType: "lunch",
    recipe: {
      ingredients: ["300ml tomato soup", "50g rice", "cream", "parsley"],
      instructions: ["Cook rice", "Heat soup", "Add cream and parsley"],
      prepTime: 20,
      nutritionInfo: { calories: 340, protein: 8, carbs: 58, fat: 9 }
    }
  },

  // Dinner options
  {
    name: "Pork Cutlet with Potatoes",
    mealType: "dinner",
    recipe: {
      ingredients: ["150g pork cutlet", "200g potatoes", "cabbage", "butter"],
      instructions: ["Fry cutlet", "Boil potatoes", "Stew cabbage"],
      prepTime: 25,
      nutritionInfo: { calories: 520, protein: 32, carbs: 35, fat: 28 }
    }
  },
  {
    name: "Fish with Vegetables",
    mealType: "dinner",
    recipe: {
      ingredients: ["150g fish fillet", "broccoli", "carrot", "oil", "lemon"],
      instructions: ["Fry fish", "Steam vegetables", "Drizzle with lemon"],
      prepTime: 18,
      nutritionInfo: { calories: 320, protein: 28, carbs: 12, fat: 18 }
    }
  },
  {
    name: "Dumplings with Cabbage",
    mealType: "dinner",
    recipe: {
      ingredients: ["8 dumplings", "sauerkraut", "onion", "butter"],
      instructions: ["Boil dumplings", "Sauté cabbage with onion", "Serve together"],
      prepTime: 15,
      nutritionInfo: { calories: 450, protein: 12, carbs: 68, fat: 16 }
    }
  }
];

export async function generateFastMealPlan(preferences: {
  dietaryType: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies?: string[];
  excludedIngredients?: string[];
  maxCookingTime?: number;
  budgetPreference?: string;
  preferredIngredients?: string[];
  language?: string;
  customMeals?: MealTemplate[];
}): Promise<{
  meals: MealTemplate[];
  totalCalories: number;
}> {
  
  const { calorieTarget, mealsPerDay } = preferences;
  
  // Use custom meals if provided, otherwise use default templates
  const mealPool = preferences.customMeals || englishMealTemplates;
  
  // Filter meals based on cooking time preference
  const maxTime = preferences.maxCookingTime || 30;
  const availableMeals = mealPool.filter(meal => 
    meal.recipe.prepTime <= maxTime
  );
  
  // Select meals for the day
  const selectedMeals: MealTemplate[] = [];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  
  for (let i = 0; i < Math.min(mealsPerDay, 3); i++) {
    const mealType = mealTypes[i];
    const mealsOfType = availableMeals.filter(m => m.mealType === mealType);
    
    if (mealsOfType.length > 0) {
      // Pick a random meal of this type
      const randomMeal = mealsOfType[Math.floor(Math.random() * mealsOfType.length)];
      selectedMeals.push(randomMeal);
    }
  }
  
  const totalCalories = selectedMeals.reduce((sum, meal) => 
    sum + meal.recipe.nutritionInfo.calories, 0
  );
  
  return {
    meals: selectedMeals,
    totalCalories
  };
}

export async function generateFastWeeklyMealPlan(preferences: {
  dietaryType: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies?: string[];
  excludedIngredients?: string[];
  maxCookingTime?: number;
  budgetPreference?: string;
  preferredIngredients?: string[];
  language?: string;
}): Promise<Array<{
  date: string;
  meals: MealTemplate[];
  totalCalories: number;
}>> {
  
  const weeklyPlan = [];
  
  for (let day = 0; day < 7; day++) {
    const dailyPlan = await generateFastMealPlan(preferences);
    
    // Add some variation by shuffling available meals
    const shuffledMeals = [...dailyPlan.meals].sort(() => Math.random() - 0.5);
    
    weeklyPlan.push({
      date: `Day ${day + 1}`,
      meals: shuffledMeals,
      totalCalories: dailyPlan.totalCalories
    });
  }
  
  return weeklyPlan;
}

// Vegetarian meal templates (no meat, poultry, fish, seafood)
const vegetarianMealTemplates: MealTemplate[] = [
  // Breakfast options
  {
    name: "Cheese and Spinach Omelet",
    mealType: "breakfast",
    recipe: {
      ingredients: ["3 eggs", "50g yellow cheese", "handful of spinach", "butter"],
      instructions: ["Beat eggs", "Fry spinach", "Add eggs and cheese"],
      prepTime: 10,
      nutritionInfo: { calories: 320, protein: 22, carbs: 4, fat: 24 }
    }
  },
  {
    name: "Oatmeal with Nuts and Fruits",
    mealType: "breakfast",
    recipe: {
      ingredients: ["50g oat flakes", "200ml plant milk", "nuts", "berries"],
      instructions: ["Cook oatmeal", "Add nuts", "Sprinkle with berries"],
      prepTime: 8,
      nutritionInfo: { calories: 350, protein: 12, carbs: 45, fat: 14 }
    }
  },
  // Lunch options
  {
    name: "Quinoa Salad with Vegetables",
    mealType: "lunch",
    recipe: {
      ingredients: ["100g quinoa", "tomatoes", "cucumber", "feta", "olive oil"],
      instructions: ["Cook quinoa", "Chop vegetables", "Mix with feta"],
      prepTime: 15,
      nutritionInfo: { calories: 420, protein: 16, carbs: 52, fat: 18 }
    }
  },
  {
    name: "Broccoli Cream Soup",
    mealType: "lunch",
    recipe: {
      ingredients: ["400g broccoli", "onion", "vegetable broth", "cream"],
      instructions: ["Cook broccoli", "Blend", "Add cream"],
      prepTime: 20,
      nutritionInfo: { calories: 280, protein: 12, carbs: 18, fat: 20 }
    }
  },
  // Dinner options
  {
    name: "Pasta with Tomato Sauce and Basil",
    mealType: "dinner",
    recipe: {
      ingredients: ["80g pasta", "tomato sauce", "basil", "parmesan"],
      instructions: ["Cook pasta", "Heat sauce", "Add basil and cheese"],
      prepTime: 15,
      nutritionInfo: { calories: 450, protein: 18, carbs: 65, fat: 14 }
    }
  },
  {
    name: "Steamed Vegetables with Rice",
    mealType: "dinner",
    recipe: {
      ingredients: ["80g rice", "broccoli", "carrot", "zucchini", "soy sauce"],
      instructions: ["Cook rice", "Steam vegetables", "Serve with sauce"],
      prepTime: 25,
      nutritionInfo: { calories: 380, protein: 10, carbs: 72, fat: 6 }
    }
  }
];

export async function generateFastPersonalizedMealPlan(preferences: {
  dietaryType: string;
  calorieTarget: number;
  mealsPerDay: number;
  allergies?: string[];
  excludedIngredients?: string[];
  maxCookingTime?: number;
  budgetPreference?: string;
  preferredIngredients?: string[];
  healthGoals?: string[];
  cuisinePreferences?: string[];
  cookingSkillLevel?: string;
  language?: string;
}, days: number = 1): Promise<{
  plan: Array<{
    date: string;
    meals: MealTemplate[];
    totalCalories: number;
  }>;
  totalCost: number;
}> {
  
  // Force AI generation for vegetarian/vegan to ensure dietary compliance
  if (preferences.dietaryType === 'vegetarian' || preferences.dietaryType === 'vegan') {
    console.log('🌱 Vegetarian/vegan diet detected - redirecting to AI generation for accuracy');
    throw new Error('DIETARY_COMPLIANCE_REQUIRED');
  }
  
  const weeklyPlan = [];
  
  // Create cuisine-specific templates based on preferences
  const asianMeals = [
    {
      name: "Fried Rice with Vegetables",
      mealType: "lunch",
      recipe: {
        ingredients: ["rice", "carrot", "peas", "eggs", "soy sauce"],
        instructions: ["Cook rice", "Fry vegetables", "Add eggs and sauce"],
        prepTime: 20,
        nutritionInfo: { calories: 450, protein: 15, carbs: 75, fat: 8 }
      }
    },
    {
      name: "Teriyaki Chicken",
      mealType: "dinner", 
      recipe: {
        ingredients: ["chicken breast", "teriyaki sauce", "rice", "broccoli"],
        instructions: ["Fry chicken", "Add teriyaki sauce", "Serve with rice"],
        prepTime: 25,
        nutritionInfo: { calories: 520, protein: 35, carbs: 45, fat: 12 }
      }
    },
    {
      name: "Miso Ramen",
      mealType: "dinner",
      recipe: {
        ingredients: ["ramen noodles", "miso paste", "egg", "green onion", "shiitake"],
        instructions: ["Cook noodles", "Prepare miso broth", "Add egg and mushrooms"],
        prepTime: 30,
        nutritionInfo: { calories: 480, protein: 20, carbs: 65, fat: 15 }
      }
    }
  ];

  // Use Asian meals if preference is Asian cuisine
  console.log('Checking cuisine preferences:', preferences.cuisinePreferences);
  
  let availableMeals = englishMealTemplates;
  
  if (preferences.cuisinePreferences && Array.isArray(preferences.cuisinePreferences)) {
    if (preferences.cuisinePreferences.includes('azjatycka')) {
      availableMeals = [...englishMealTemplates, ...asianMeals];
      console.log('Using Asian cuisine meals - added', asianMeals.length, 'Asian dishes');
    }
  }
  
  console.log('Total available meals:', availableMeals.length);
  
  // Create a pool of all available meals and shuffle for variety
  const shuffledMeals = [...availableMeals].sort(() => Math.random() - 0.5);
  
  for (let day = 0; day < days; day++) {
    // Get different meals for each day to avoid repetition
    const dayMeals = [];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    for (let i = 0; i < Math.min(preferences.mealsPerDay || 3, 3); i++) {
      const mealType = mealTypes[i];
      const typeOptions = shuffledMeals.filter(meal => meal.mealType === mealType);
      
      if (typeOptions.length > 0) {
        // Select different meal for each day
        const mealIndex = (day + i) % typeOptions.length;
        const selectedMeal = { ...typeOptions[mealIndex] };
        
        // Add variety by rotating through available options
        if (day > 0 && typeOptions.length > 1) {
          const alternativeIndex = (day + i + 1) % typeOptions.length;
          if (alternativeIndex !== mealIndex) {
            selectedMeal.name = typeOptions[alternativeIndex].name;
            selectedMeal.recipe = { ...typeOptions[alternativeIndex].recipe };
          }
        }
        
        dayMeals.push(selectedMeal);
      }
    }
    
    const totalCalories = dayMeals.reduce((sum, meal) => sum + (meal.recipe?.nutritionInfo?.calories || 0), 0);
    
    weeklyPlan.push({
      date: `Day ${day + 1}`,
      meals: dayMeals,
      totalCalories: totalCalories
    });
  }
  
  return {
    plan: weeklyPlan,
    totalCost: 0
  };
}