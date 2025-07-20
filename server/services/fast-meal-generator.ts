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

// Expanded Polish meal templates for variety
const polishMealTemplates: MealTemplate[] = [
  // Breakfast options (7 different)
  {
    name: "Jajecznica z pomidorami",
    mealType: "breakfast",
    recipe: {
      ingredients: ["3 jajka", "1 pomidor", "masło", "sól", "pieprz"],
      instructions: ["Podsmaż pomidor na maśle", "Dodaj roztrzepane jajka", "Smaż mieszając"],
      prepTime: 10,
      nutritionInfo: { calories: 280, protein: 18, carbs: 6, fat: 20 }
    }
  },
  {
    name: "Owsianka z owocami",
    mealType: "breakfast", 
    recipe: {
      ingredients: ["50g płatków owsianych", "200ml mleka", "1 banan", "miód"],
      instructions: ["Zalej płatki mlekiem", "Dodaj pokrojony banan", "Polej miodem"],
      prepTime: 5,
      nutritionInfo: { calories: 320, protein: 12, carbs: 55, fat: 6 }
    }
  },
  {
    name: "Tosty z awokado",
    mealType: "breakfast",
    recipe: {
      ingredients: ["2 kromki chleba", "1 awokado", "sól", "pieprz", "cytryna"],
      instructions: ["Opiecz chleb", "Rozgnieć awokado z solą", "Posmaruj na tostach"],
      prepTime: 8,
      nutritionInfo: { calories: 350, protein: 8, carbs: 35, fat: 22 }
    }
  },
  {
    name: "Omlet z serem",
    mealType: "breakfast",
    recipe: {
      ingredients: ["3 jajka", "50g sera żółtego", "masło", "szczypiorek"],
      instructions: ["Roztrzep jajka", "Usmaż omlet", "Dodaj ser i szczypiorek"],
      prepTime: 12,
      nutritionInfo: { calories: 380, protein: 25, carbs: 3, fat: 28 }
    }
  },
  {
    name: "Kanapki z szynką",
    mealType: "breakfast",
    recipe: {
      ingredients: ["2 kromki chleba", "100g szynki", "masło", "ogórek", "pomidor"],
      instructions: ["Posmaruj chleb masłem", "Dodaj szynkę", "Przygarnij warzywa"],
      prepTime: 5,
      nutritionInfo: { calories: 320, protein: 20, carbs: 25, fat: 15 }
    }
  },
  {
    name: "Płatki z jogurtem",
    mealType: "breakfast",
    recipe: {
      ingredients: ["40g płatków kukurydzianych", "150ml jogurtu", "jagody", "miód"],
      instructions: ["Zalej płatki jogurtem", "Dodaj jagody", "Polej miodem"],
      prepTime: 3,
      nutritionInfo: { calories: 290, protein: 10, carbs: 45, fat: 8 }
    }
  },
  {
    name: "Sernik na zimno",
    mealType: "breakfast",
    recipe: {
      ingredients: ["200g twarogu", "1 łyżka miodu", "orzechy", "cynamon"],
      instructions: ["Wymieszaj twaróg z miodem", "Dodaj orzechy", "Posyp cynamonem"],
      prepTime: 5,
      nutritionInfo: { calories: 340, protein: 28, carbs: 15, fat: 18 }
    }
  },
  
  // Lunch options
  {
    name: "Sałatka z kurczakiem",
    mealType: "lunch",
    recipe: {
      ingredients: ["150g piersi kurczaka", "sałata", "pomidor", "ogórek", "oliwa"],
      instructions: ["Usmaż kurczaka", "Pokrój warzywa", "Wymieszaj z oliwą"],
      prepTime: 15,
      nutritionInfo: { calories: 380, protein: 35, carbs: 8, fat: 24 }
    }
  },
  {
    name: "Makaron z sosem pomidorowym",
    mealType: "lunch",
    recipe: {
      ingredients: ["80g makaronu", "150ml sosu pomidorowego", "parmezan", "bazylia"],
      instructions: ["Ugotuj makaron", "Podgrzej sos", "Wymieszaj z parmezanem"],
      prepTime: 12,
      nutritionInfo: { calories: 420, protein: 16, carbs: 65, fat: 12 }
    }
  },
  {
    name: "Zupa pomidorowa z ryżem",
    mealType: "lunch",
    recipe: {
      ingredients: ["300ml zupy pomidorowej", "50g ryżu", "śmietana", "natka"],
      instructions: ["Ugotuj ryż", "Podgrzej zupę", "Dodaj śmietanę i natkę"],
      prepTime: 20,
      nutritionInfo: { calories: 340, protein: 8, carbs: 58, fat: 9 }
    }
  },

  // Dinner options
  {
    name: "Kotlet schabowy z ziemniakami",
    mealType: "dinner",
    recipe: {
      ingredients: ["150g kotleta", "200g ziemniaków", "kapusta", "masło"],
      instructions: ["Usmaż kotlet", "Ugotuj ziemniaki", "Podduś kapustę"],
      prepTime: 25,
      nutritionInfo: { calories: 520, protein: 32, carbs: 35, fat: 28 }
    }
  },
  {
    name: "Ryba z warzywami",
    mealType: "dinner",
    recipe: {
      ingredients: ["150g fileta rybnego", "brokuły", "marchewka", "olej", "cytryna"],
      instructions: ["Usmaż rybę", "Ugotuj warzywa na parze", "Skrop cytryną"],
      prepTime: 18,
      nutritionInfo: { calories: 320, protein: 28, carbs: 12, fat: 18 }
    }
  },
  {
    name: "Pierogi z kapustą",
    mealType: "dinner",
    recipe: {
      ingredients: ["8 pierogów", "kapusta kiszona", "cebula", "masło"],
      instructions: ["Ugotuj pierogi", "Podsmaż kapustę z cebulą", "Podawaj razem"],
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
  const mealPool = preferences.customMeals || polishMealTemplates;
  
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
    name: "Omlet z serem i szpinakiem",
    mealType: "breakfast",
    recipe: {
      ingredients: ["3 jajka", "50g sera żółtego", "garść szpinaku", "masło"],
      instructions: ["Roztrzep jajka", "Usmaż szpinak", "Dodaj jajka i ser"],
      prepTime: 10,
      nutritionInfo: { calories: 320, protein: 22, carbs: 4, fat: 24 }
    }
  },
  {
    name: "Owsianka z orzechami i owocami",
    mealType: "breakfast",
    recipe: {
      ingredients: ["50g płatków owsianych", "200ml mleka roślinnego", "orzechy", "jagody"],
      instructions: ["Ugotuj owsiankę", "Dodaj orzechy", "Posyp jagodami"],
      prepTime: 8,
      nutritionInfo: { calories: 350, protein: 12, carbs: 45, fat: 14 }
    }
  },
  // Lunch options
  {
    name: "Sałatka z quinoa i warzywami",
    mealType: "lunch",
    recipe: {
      ingredients: ["100g quinoa", "pomidory", "ogórek", "feta", "oliwa"],
      instructions: ["Ugotuj quinoa", "Pokrój warzywa", "Wymieszaj z fetą"],
      prepTime: 15,
      nutritionInfo: { calories: 420, protein: 16, carbs: 52, fat: 18 }
    }
  },
  {
    name: "Zupa krem z brokułów",
    mealType: "lunch",
    recipe: {
      ingredients: ["400g brokułów", "cebula", "bulion warzywny", "śmietanka"],
      instructions: ["Ugotuj brokuły", "Zblenduj", "Dodaj śmietankę"],
      prepTime: 20,
      nutritionInfo: { calories: 280, protein: 12, carbs: 18, fat: 20 }
    }
  },
  // Dinner options
  {
    name: "Makaron z sosem pomidorowym i bazylią",
    mealType: "dinner",
    recipe: {
      ingredients: ["80g makaronu", "sos pomidorowy", "bazylia", "parmezan"],
      instructions: ["Ugotuj makaron", "Podgrzej sos", "Dodaj bazylię i ser"],
      prepTime: 15,
      nutritionInfo: { calories: 450, protein: 18, carbs: 65, fat: 14 }
    }
  },
  {
    name: "Warzywa na parze z ryżem",
    mealType: "dinner",
    recipe: {
      ingredients: ["80g ryżu", "brokuły", "marchewka", "cukinia", "sos sojowy"],
      instructions: ["Ugotuj ryż", "Ugotuj warzywa na parze", "Podawaj z sosem"],
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
      name: "Ryż smażony z warzywami",
      mealType: "lunch",
      recipe: {
        ingredients: ["ryż", "marchewka", "groszek", "jajka", "sos sojowy"],
        instructions: ["Ugotuj ryż", "Usmaż warzywa", "Dodaj jajka i sos"],
        prepTime: 20,
        nutritionInfo: { calories: 450, protein: 15, carbs: 75, fat: 8 }
      }
    },
    {
      name: "Kurczak teriyaki",
      mealType: "dinner", 
      recipe: {
        ingredients: ["pierś kurczaka", "sos teriyaki", "ryż", "brokuły"],
        instructions: ["Usmaż kurczaka", "Dodaj sos teriyaki", "Podawaj z ryżem"],
        prepTime: 25,
        nutritionInfo: { calories: 520, protein: 35, carbs: 45, fat: 12 }
      }
    },
    {
      name: "Miso ramen",
      mealType: "dinner",
      recipe: {
        ingredients: ["makaron ramen", "pasta miso", "jajko", "szczypiorek", "shiitake"],
        instructions: ["Ugotuj makaron", "Przygotuj bulion miso", "Dodaj jajko i grzyby"],
        prepTime: 30,
        nutritionInfo: { calories: 480, protein: 20, carbs: 65, fat: 15 }
      }
    }
  ];

  // Use Asian meals if preference is Asian cuisine
  console.log('Checking cuisine preferences:', preferences.cuisinePreferences);
  
  let availableMeals = polishMealTemplates;
  
  if (preferences.cuisinePreferences && Array.isArray(preferences.cuisinePreferences)) {
    if (preferences.cuisinePreferences.includes('azjatycka')) {
      availableMeals = [...polishMealTemplates, ...asianMeals];
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