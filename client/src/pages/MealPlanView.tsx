import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday } from "date-fns";
import { useTranslation } from "react-i18next";
import BaseLayout from "@/components/layouts/BaseLayout";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  Flame, 
  ShoppingBag, 
  Clock,
  Sparkles,
  ChefHat,
  UtensilsCrossed,
  ArrowLeft,
  Play,
  RefreshCw
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

// Meal type emoji mapping
const mealEmojis: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

export default function MealPlanView() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Invalidate meal plans when component mounts to ensure fresh data
  useEffect(() => {
    const invalidator = createInvalidator(queryClient);
    invalidator.mealPlans();
  }, [queryClient]);

  // Fetch all meal plans using custom hook
  const { data: mealPlansData, isLoading, isError, refetch } = useAllMealPlans();

  const getMealTypeLabel = (mealType: string) => {
    const key = mealType.toLowerCase();
    const validKeys = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (validKeys.includes(key)) {
      return t(`common:mealPlanView.mealTypes.${key}`);
    }
    return mealType;
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA] via-[#26A8FF] to-[#0CC5BA] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white mx-auto mb-4"
          />
          <p className="text-white text-lg font-medium">Loading your meal plan...</p>
        </motion.div>
      </div>
    );
  }

  // Empty/Error State
  if (isError || !mealPlansData || mealPlansData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0CC5BA] via-[#26A8FF] to-[#0CC5BA] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">No Meal Plan Yet</h2>
          <p className="text-white/70 mb-8">Create a personalized meal plan based on your goals</p>
          <Button
            onClick={() => setLocation("/meal-planning-quiz")}
            className="bg-white hover:bg-white/90 text-[#0CC5BA] font-semibold px-8 py-6 rounded-2xl shadow-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Create Meal Plan
          </Button>
        </motion.div>
      </div>
    );
  }

  // Get the week's plans
  const weekPlans = mealPlansData.slice(-7);
  const totalWeekCalories = weekPlans.reduce((sum: number, day: any) => sum + (day.totalCalories || 0), 0);
  const avgDailyCalories = Math.round(totalWeekCalories / weekPlans.length);
  const totalMeals = weekPlans.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0);

  return (
    <BaseLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-10 h-10 bg-white/70 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Meal Plan</h1>
            <p className="text-gray-500 text-sm">Your weekly recipes</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="w-10 h-10 bg-white/70 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-sm"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </motion.div>

      {/* Week Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        {/* Calories Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-4 shadow-sm border border-white/60">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-orange-500/25">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-500 text-xs font-medium">Avg. Daily</p>
          <p className="text-gray-900 text-2xl font-bold">{avgDailyCalories}</p>
          <p className="text-gray-400 text-xs">calories</p>
        </div>

        {/* Meals Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-4 shadow-sm border border-white/60">
          <div className="w-12 h-12 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#0CC5BA]/25">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-500 text-xs font-medium">Total Meals</p>
          <p className="text-gray-900 text-2xl font-bold">{totalMeals}</p>
          <p className="text-gray-400 text-xs">this week</p>
        </div>
      </motion.div>

      {/* Daily Meal Plans */}
      <div className="space-y-3 mb-6">
        {weekPlans.map((day: any, dayIndex: number) => {
          const dayDate = new Date(day.date);
          const isExpanded = expandedDay === day.date;
          const dayMeals = day.meals || [];
          const isTodayDate = isToday(dayDate);

          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + dayIndex * 0.05 }}
              className={`bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border ${
                isTodayDate ? "border-[#0CC5BA]/50 ring-2 ring-[#0CC5BA]/20" : "border-white/60"
              }`}
            >
              {/* Day Header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  {/* Date Badge */}
                  <div className={`text-center rounded-2xl px-3 py-2 min-w-[3.5rem] ${
                    isTodayDate 
                      ? "bg-gradient-to-br from-[#0CC5BA] to-blue-500" 
                      : "bg-gray-100"
                  }`}>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${
                      isTodayDate ? "text-white/80" : "text-gray-400"
                    }`}>
                      {format(dayDate, "EEE")}
                    </p>
                    <p className={`text-xl font-bold leading-none ${
                      isTodayDate ? "text-white" : "text-gray-700"
                    }`}>
                      {format(dayDate, "d")}
                    </p>
                  </div>
                  
                  {/* Day Info */}
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-900 font-bold text-base">
                        {format(dayDate, "MMMM d")}
                      </p>
                      {isTodayDate && (
                        <span className="text-[10px] font-bold text-[#0CC5BA] bg-[#0CC5BA]/10 px-2 py-0.5 rounded-full">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mt-0.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="font-medium">{day.totalCalories} cal</span>
                      <span className="text-gray-300">•</span>
                      <span>{dayMeals.length} meals</span>
                    </div>
                  </div>
                </div>
                
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </motion.div>
              </button>

              {/* Meals List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-3 space-y-2">
                      {dayMeals.map((meal: any) => {
                        const isMealExpanded = expandedMeal === meal.id;
                        const nutrition = meal.recipe?.nutritionInfo;
                        const mealEmoji = mealEmojis[meal.mealType?.toLowerCase()] || "🍽️";

                        return (
                          <div
                            key={meal.id}
                            className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                          >
                            {/* Meal Header */}
                            <button
                              onClick={() => setExpandedMeal(isMealExpanded ? null : meal.id)}
                              className="w-full p-3 flex items-center space-x-3"
                            >
                              {/* Meal Image or Emoji */}
                              {meal.imageUrl ? (
                                <img
                                  src={meal.imageUrl}
                                  alt={meal.name}
                                  className="w-14 h-14 rounded-xl object-cover shadow-sm"
                                />
                              ) : (
                                <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center text-2xl">
                                  {mealEmoji}
                                </div>
                              )}
                              
                              {/* Meal Info */}
                              <div className="flex-1 text-left">
                                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                                  {mealEmoji} {getMealTypeLabel(meal.mealType)}
                                </span>
                                <p className="text-gray-900 font-semibold text-sm leading-tight mt-0.5">
                                  {meal.name}
                                </p>
                                {nutrition && (
                                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px] text-gray-500">
                                    <span className="font-medium text-orange-500">{nutrition.calories} cal</span>
                                    <span className="text-gray-300">•</span>
                                    <span>P {nutrition.protein}g</span>
                                    <span>C {nutrition.carbs}g</span>
                                    <span>F {nutrition.fat}g</span>
                                  </div>
                                )}
                              </div>

                              <motion.div
                                animate={{ rotate: isMealExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
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
                                  transition={{ duration: 0.2 }}
                                  className="border-t border-gray-100"
                                >
                                  <div className="p-4 space-y-4 bg-gray-50/50">
                                    {/* Prep Time */}
                                    {meal.recipe?.prepTime && (
                                      <div className="flex items-center space-x-2 text-gray-600 text-xs font-medium">
                                        <Clock className="w-4 h-4 text-[#0CC5BA]" />
                                        <span>{meal.recipe.prepTime} min prep time</span>
                                      </div>
                                    )}

                                    {/* Ingredients */}
                                    {meal.recipe?.ingredients?.length > 0 && (
                                      <div>
                                        <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-2 flex items-center">
                                          <span className="w-1.5 h-1.5 bg-[#0CC5BA] rounded-full mr-2" />
                                          Ingredients
                                        </h4>
                                        <ul className="space-y-1.5 pl-3.5">
                                          {meal.recipe.ingredients.map((ingredient: any, idx: number) => (
                                            <li
                                              key={idx}
                                              className="text-gray-600 text-xs flex items-start space-x-2"
                                            >
                                              <span className="text-[#0CC5BA] font-bold">•</span>
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
                                    {meal.recipe?.instructions?.length > 0 && (
                                      <div>
                                        <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-2 flex items-center">
                                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                                          Instructions
                                        </h4>
                                        <ol className="space-y-2 pl-3.5">
                                          {meal.recipe.instructions.map((step: any, idx: number) => (
                                            <li
                                              key={idx}
                                              className="text-gray-600 text-xs flex space-x-2"
                                            >
                                              <span className="text-blue-500 font-bold min-w-[1.25rem]">
                                                {idx + 1}.
                                              </span>
                                              <span>{step}</span>
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}

                                    {/* Start Cooking Button */}
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLocation(`/cooking-mode/${meal.id}`);
                                      }}
                                      className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 text-white py-3 rounded-xl font-medium text-sm"
                                    >
                                      <Play className="w-4 h-4 mr-2" />
                                      Start Cooking Mode
                                    </Button>
                                  </div>
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

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3 pb-6"
      >
        <Button
          onClick={() => setLocation("/recipes?tab=meal-plan#grocery-list")}
          className="w-full bg-white/70 backdrop-blur-xl hover:bg-white text-gray-900 border border-white/60 py-6 text-base font-semibold rounded-2xl shadow-sm"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          View Shopping List
        </Button>
        <Button
          onClick={() => setLocation("/meal-planning-quiz")}
          className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90 text-white py-6 text-base font-semibold rounded-2xl shadow-lg shadow-[#0CC5BA]/25"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate New Plan
        </Button>
      </motion.div>
    </BaseLayout>
  );
}
