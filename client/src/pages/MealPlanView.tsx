import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import BaseLayout from "@/components/layouts/BaseLayout";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  Flame, 
  ShoppingBag, 
  Check, 
  Clock,
  Sparkles,
  ChefHat
} from "lucide-react";
import { useAllMealPlans, useCompleteMeal } from "@/hooks/queries/useMealPlans";
import { createInvalidator } from "@/lib/queryUtils";

interface Meal {
  id: number;
  name: string;
  mealType: string;
  imageUrl?: string;
  recipe: {
    ingredients: Array<{ name: string; quantity: string }>;
    instructions: string[];
    nutritionInfo: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    prepTime?: number;
  };
}

interface DayPlan {
  id: number;
  date: string;
  totalCalories: number;
  status: string;
  meals: Meal[];
}

interface MealPlansResponse {
  weekStart: string;
  plans: DayPlan[];
}

export default function MealPlanView() {
  const [, setLocation] = useLocation();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Invalidate meal plans when component mounts to ensure fresh data
  useEffect(() => {
    console.log('[MealPlanView] Component mounted, invalidating queries');
    const invalidator = createInvalidator(queryClient);
    invalidator.mealPlans();
  }, [queryClient]);

  // Fetch all meal plans using custom hook with aggressive refetching
  const { data: mealPlansData, isLoading, isError, refetch } = useAllMealPlans();
  
  console.log('[MealPlanView] Render state:', { 
    isLoading, 
    isError, 
    hasData: !!mealPlansData,
    dataLength: mealPlansData?.length,
    mealPlansData 
  });

  if (isLoading) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-5"
        >
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading your meal plan...</p>
        </motion.div>
      </div>
    );
  }

  if (isError || !mealPlansData || mealPlansData.length === 0) {
    return (
      <div className="gradient-bg min-h-screen flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-white text-lg mb-6">No meal plan found</p>
          <Button
            onClick={() => setLocation("/meal-planning-quiz-new")}
            className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/20"
          >
            Create a Meal Plan
          </Button>
        </motion.div>
      </div>
    );
  }

  // Get the week's plans (latest 7 days) - mealPlansData is already an array
  const weekPlans = mealPlansData.slice(-7);
  const firstDate = weekPlans[0]?.date ? new Date(weekPlans[0].date) : new Date();
  const lastDate = weekPlans[weekPlans.length - 1]?.date 
    ? new Date(weekPlans[weekPlans.length - 1].date) 
    : addDays(firstDate, 6);

  const totalWeekCalories = weekPlans.reduce((sum: number, day: any) => sum + (day.totalCalories || 0), 0);
  const avgDailyCalories = Math.round(totalWeekCalories / weekPlans.length);

  const getMealTypeLabel = (mealType: string) => {
    const labels: Record<string, string> = {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      snack: "Snack",
    };
    return labels[mealType.toLowerCase()] || mealType;
  };

  return (
    <BaseLayout>
      {/* Week Summary Card - Dashboard Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 mb-5 shadow-lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <p className="text-gray-500 text-xs font-medium mb-1">Avg Daily</p>
            <p className="text-gray-900 text-xl font-bold">{avgDailyCalories}</p>
            <p className="text-gray-400 text-xs">calories</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <p className="text-gray-500 text-xs font-medium mb-1">Total Meals</p>
            <p className="text-gray-900 text-xl font-bold">
              {weekPlans.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0)}
            </p>
            <p className="text-gray-400 text-xs">this week</p>
          </div>
        </div>
      </motion.div>

      {/* Daily Meal Plans - Dashboard Card Style */}
      <div className="space-y-3 mb-6">
        {weekPlans.map((day: any, dayIndex: number) => {
          const dayDate = new Date(day.date);
          const isExpanded = expandedDay === day.date;
          const dayMeals = day.meals || [];

          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + dayIndex * 0.05 }}
              className="bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden shadow-md"
            >
              {/* Day Header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-center bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-2xl px-3 py-2 min-w-[3.5rem]">
                    <p className="text-white/80 text-[10px] uppercase font-bold tracking-wider">
                      {format(dayDate, "EEE")}
                    </p>
                    <p className="text-white text-xl font-bold leading-none">
                      {format(dayDate, "d")}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-900 font-bold text-base">
                      {format(dayDate, "MMMM d")}
                    </p>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mt-0.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span className="font-medium">{day.totalCalories} cal</span>
                      <span>•</span>
                      <span>{dayMeals.length} meals</span>
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              </button>

              {/* Meals for the Day */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 space-y-3">
                      {dayMeals.map((meal: any) => {
                        const isMealExpanded = expandedMeal === meal.id;
                        const nutrition = meal.recipe?.nutritionInfo;

                        return (
                          <div
                            key={meal.id}
                            className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100"
                          >
                            {/* Meal Header */}
                            <button
                              onClick={() =>
                                setExpandedMeal(isMealExpanded ? null : meal.id)
                              }
                              className="w-full p-3 flex items-center space-x-3 hover:bg-gray-100 transition-colors"
                            >
                              {/* Meal Image */}
                              {meal.imageUrl && (
                                <img
                                  src={meal.imageUrl}
                                  alt={meal.name}
                                  className="w-14 h-14 rounded-xl object-cover shadow-sm"
                                />
                              )}
                              
                              {/* Meal Info */}
                              <div className="flex-1 text-left">
                                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block mb-1">
                                  {getMealTypeLabel(meal.mealType)}
                                </span>
                                <p className="text-gray-900 font-semibold text-sm leading-tight">
                                  {meal.name}
                                </p>
                                {nutrition && (
                                  <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-gray-500 font-medium">
                                    <span>{nutrition.calories} cal</span>
                                    <span>•</span>
                                    <span>P {nutrition.protein}g</span>
                                    <span>C {nutrition.carbs}g</span>
                                    <span>F {nutrition.fat}g</span>
                                  </div>
                                )}
                              </div>

                              <motion.div
                                animate={{ rotate: isMealExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              </motion.div>
                            </button>

                            {/* Meal Details */}
                            <AnimatePresence>
                              {isMealExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t border-gray-200 p-4 space-y-4 bg-white"
                                >
                                  {/* Prep Time */}
                                  {meal.recipe?.prepTime && (
                                    <div className="flex items-center space-x-2 text-gray-500 text-xs font-medium">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>{meal.recipe.prepTime} min prep time</span>
                                    </div>
                                  )}

                                  {/* Ingredients */}
                                  {meal.recipe?.ingredients && meal.recipe.ingredients.length > 0 && (
                                    <div>
                                      <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-2">
                                        Ingredients
                                      </h4>
                                      <ul className="space-y-1.5">
                                        {meal.recipe.ingredients.map((ingredient: any, idx: number) => (
                                          <li
                                            key={idx}
                                            className="text-gray-600 text-xs flex items-start space-x-2"
                                          >
                                            <span className="text-[#0CC5BA] mt-0.5 font-bold">•</span>
                                            <span>
                                              {typeof ingredient === "string"
                                                ? ingredient
                                                : `${ingredient.quantity} ${ingredient.name}`}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Instructions */}
                                  {meal.recipe?.instructions && meal.recipe.instructions.length > 0 && (
                                    <div>
                                      <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-2">
                                        Instructions
                                      </h4>
                                      <ol className="space-y-2">
                                        {meal.recipe.instructions.map((step: any, idx: number) => (
                                          <li
                                            key={idx}
                                            className="text-gray-600 text-xs flex space-x-2"
                                          >
                                            <span className="text-[#0CC5BA] font-bold min-w-[1.25rem]">
                                              {idx + 1}.
                                            </span>
                                            <span>{step}</span>
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons - Dashboard Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="space-y-3 mb-6"
      >
        <Button
          onClick={() => setLocation("/recipes?tab=meal-plan#grocery-list")}
          className="w-full bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 border-0 py-6 text-base font-semibold rounded-3xl shadow-md"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          View Shopping List
        </Button>
        <Button
          onClick={() => setLocation("/recipes?tab=meal-plan")}
          className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90 text-white py-6 text-base font-semibold rounded-3xl shadow-lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Start My Week
        </Button>
      </motion.div>
    </BaseLayout>
  );
}
