import { useState } from 'react';
import { Clock, Utensils, ShoppingCart, ChevronRight, Coffee, Pizza } from 'lucide-react';

interface Recipe {
  id: number;
  name: string;
  description?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients: any;
  instructions?: any;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
  mealType?: string;
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MealPlanSectionProps {
  mealPlan: {
    id: number;
    meals: Recipe[];
    totalCalories: number;
    targetCalories: number;
  } | null;
}

export default function MealPlanSection({ mealPlan }: MealPlanSectionProps) {
  const [activeTab, setActiveTab] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');

  if (!mealPlan || !mealPlan.meals || mealPlan.meals.length === 0) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div className="card">
          <h2 className="text-lg font-semibold text-[#26A8FF] mb-4">Today's Meal Plan</h2>
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-4">No meal plan for today</p>
            <button
              onClick={() => window.location.href = '/meal-planning-quiz'}
              className="px-4 py-2 bg-[#26A8FF] text-white rounded-lg text-sm font-medium hover:bg-[#1A8FE6] transition-colors"
            >
              Generate Meal Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Categorize meals by type
  const breakfast = mealPlan.meals.find(m => 
    m.name?.toLowerCase().includes('breakfast') || 
    m.name?.toLowerCase().includes('morning') ||
    m.name?.toLowerCase().includes('omelette') ||
    m.name?.toLowerCase().includes('pancake') ||
    m.name?.toLowerCase().includes('toast') ||
    m.name?.toLowerCase().includes('egg') ||
    m.name?.toLowerCase().includes('cereal')
  ) || mealPlan.meals[0];

  const dinner = mealPlan.meals.find(m => 
    m.name?.toLowerCase().includes('dinner') || 
    m.name?.toLowerCase().includes('steak') ||
    m.name?.toLowerCase().includes('salmon') ||
    m.name?.toLowerCase().includes('chicken') ||
    m.name?.toLowerCase().includes('pasta') ||
    m === mealPlan.meals[mealPlan.meals.length - 1]
  ) || mealPlan.meals[mealPlan.meals.length - 1];

  const lunch = mealPlan.meals.find(m => 
    m !== breakfast && m !== dinner && (
      m.name?.toLowerCase().includes('lunch') || 
      m.name?.toLowerCase().includes('salad') ||
      m.name?.toLowerCase().includes('sandwich')
    )
  ) || mealPlan.meals.find(m => m !== breakfast && m !== dinner) || null;

  const mealsByType = {
    breakfast,
    lunch,
    dinner
  };

  const currentMeal = mealsByType[activeTab];

  // Helper function to get meal type icon matching Recipes page
  const getMealTypeIcon = (tab: 'breakfast' | 'lunch' | 'dinner') => {
    switch(tab) {
      case 'breakfast':
        return (
          <div className="bg-[#26A8FF]/10 p-3 rounded-xl text-[#26A8FF] shadow-sm">
            <Coffee className="w-7 h-7" />
          </div>
        );
      case 'lunch':
        return (
          <div className="bg-[#26A8FF]/10 p-3 rounded-xl text-[#26A8FF] shadow-sm">
            <Pizza className="w-7 h-7" />
          </div>
        );
      case 'dinner':
        return (
          <div className="bg-[#26A8FF]/10 p-3 rounded-xl text-[#26A8FF] shadow-sm">
            <Utensils className="w-7 h-7" />
          </div>
        );
    }
  };

  // Function to get proper calories from meal
  const getMealCalories = (meal: Recipe | null): number => {
    if (!meal) return 0;
    return meal.nutritionInfo?.calories || meal.calories || 0;
  };

  // Parse ingredients for the current meal
  const getIngredients = (meal: Recipe | null) => {
    if (!meal || !meal.ingredients) return [];
    
    let ingredients = [];
    if (typeof meal.ingredients === 'string') {
      try {
        ingredients = JSON.parse(meal.ingredients);
      } catch {
        ingredients = meal.ingredients.split(',').map((i: string) => ({ 
          name: i.trim(), 
          quantity: '', 
          unit: '' 
        }));
      }
    } else if (Array.isArray(meal.ingredients)) {
      ingredients = meal.ingredients;
    }
    
    return ingredients.slice(0, 5); // Show only first 5 ingredients
  };

  const ingredients = getIngredients(currentMeal);
  const totalIngredients = currentMeal?.ingredients ? 
    (Array.isArray(currentMeal.ingredients) ? currentMeal.ingredients.length : 
    typeof currentMeal.ingredients === 'string' ? 
      (currentMeal.ingredients.includes('[') ? JSON.parse(currentMeal.ingredients).length : currentMeal.ingredients.split(',').length) : 0) : 0;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#26A8FF]">Today's Meal Plan</h2>
          <div className="flex items-center px-3 py-1.5 rounded-full bg-[#26A8FF]/10 text-[#26A8FF] text-sm font-semibold">
            {Math.round(mealPlan.totalCalories)} kcal
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
          {(['breakfast', 'lunch', 'dinner'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white text-[#26A8FF] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Meal Content */}
        {currentMeal ? (
          <div className="space-y-4">
            {/* Meal Card with Icon */}
            <div 
              className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md border border-gray-50 hover:border-[#0CC5BA]/20 cursor-pointer transition-all"
              onClick={() => window.location.href = `/recipes/${currentMeal.id}`}
            >
              <div className="flex items-center">
                {/* Meal Type Icon */}
                <div className="w-16 h-16 flex items-center justify-center">
                  {getMealTypeIcon(activeTab)}
                </div>
                
                {/* Meal Info */}
                <div className="flex-1 px-3">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base line-clamp-1">
                    {currentMeal.name.replace(/\s*\(Day \d+\)\s*$/i, '')}
                  </h3>
                  
                  {/* Calories Badge */}
                  <div className="flex items-center px-3 py-1 rounded-full bg-[#26A8FF]/10 text-[#26A8FF] inline-flex text-xs mt-1">
                    <span className="font-semibold">
                      {Math.round(getMealCalories(currentMeal))} kcal
                    </span>
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Ingredients List */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">Ingredients needed</h4>
              </div>
              {ingredients.length > 0 ? (
                <div className="space-y-1">
                  {ingredients.map((ingredient: any, index: number) => {
                    const name = ingredient.name || ingredient.ingredient || ingredient;
                    const quantity = ingredient.quantity || '';
                    const unit = ingredient.unit || '';
                    
                    return (
                      <div key={index} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{typeof name === 'string' ? name : 'Unknown'}</span>
                        {(quantity || unit) && (
                          <span className="text-xs text-gray-500">
                            {quantity && `${quantity} `}{unit}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {totalIngredients > 5 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/recipes/${currentMeal.id}`;
                      }}
                      className="text-xs text-[#26A8FF] hover:text-[#1A8FE6] font-medium pt-1"
                    >
                      +{totalIngredients - 5} more ingredients →
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-2">No ingredients available</p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-500">No {activeTab} meal planned for today</p>
          </div>
        )}
      </div>
    </div>
  );
}
