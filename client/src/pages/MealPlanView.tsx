import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { useTranslation } from "react-i18next";
import BaseLayout from "@/components/layouts/BaseLayout";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight,
  Flame, 
  ShoppingBag, 
  Clock,
  Sparkles,
  ChefHat,
  UtensilsCrossed,
  ArrowLeft,
  Play,
  RefreshCw,
  Calendar,
  Target,
  Zap,
  Coffee,
  Sun,
  Moon,
  Apple,
  Check
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

// Meal type configuration with icons and colors
const mealTypeConfig: Record<string, { icon: any; emoji: string; gradient: string; color: string }> = {
  breakfast: { 
    icon: Coffee, 
    emoji: "🌅", 
    gradient: "from-amber-400 to-orange-500",
    color: "text-amber-500"
  },
  lunch: { 
    icon: Sun, 
    emoji: "☀️", 
    gradient: "from-yellow-400 to-amber-500",
    color: "text-yellow-500"
  },
  dinner: { 
    icon: Moon, 
    emoji: "🌙", 
    gradient: "from-indigo-400 to-purple-500",
    color: "text-indigo-500"
  },
  snack: { 
    icon: Apple, 
    emoji: "🍎", 
    gradient: "from-green-400 to-emerald-500",
    color: "text-green-500"
  },
};

export default function MealPlanView() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Invalidate meal plans when component mounts to ensure fresh data
  useEffect(() => {
    const invalidator = createInvalidator(queryClient);
    invalidator.mealPlans();
  }, [queryClient]);

  // Fetch all meal plans using custom hook
  const { data: mealPlansData, isLoading, isError, refetch } = useAllMealPlans();

  // Auto-expand today's meals
  useEffect(() => {
    if (mealPlansData && mealPlansData.length > 0 && !expandedDay) {
      const todayPlan = mealPlansData.find((day: any) => isToday(new Date(day.date)));
      if (todayPlan) {
        setExpandedDay(todayPlan.date);
      }
    }
  }, [mealPlansData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getMealTypeLabel = (mealType: string) => {
    const key = mealType.toLowerCase();
    const validKeys = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (validKeys.includes(key)) {
      return t(`common:mealPlanView.mealTypes.${key}`);
    }
    return mealType;
  };

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE");
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-[#0CC5BA]/20 border-t-[#0CC5BA]"
            />
            <div className="absolute inset-3 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-gray-700 text-lg font-semibold">Loading your meal plan...</p>
          <p className="text-gray-400 text-sm mt-1">Preparing delicious recipes</p>
        </motion.div>
      </div>
    );
  }

  // Empty/Error State
  if (isError || !mealPlansData || mealPlansData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-28 h-28 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#0CC5BA]/30">
            <ChefHat className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-gray-900 text-2xl font-bold mb-3">No Meal Plan Yet</h2>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Create a personalized meal plan tailored to your nutrition goals and preferences
          </p>
          <Button
            onClick={() => setLocation("/meal-planning-quiz")}
            className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90 text-white font-semibold px-8 py-6 rounded-2xl shadow-xl shadow-[#0CC5BA]/30"
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
  const completedMeals = weekPlans.reduce((sum: number, day: any) => 
    sum + (day.meals?.filter((m: any) => m.completed)?.length || 0), 0
  );

  return (
    <BaseLayout>
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-[#0CC5BA]/20 to-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex items-center justify-between mb-8"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-11 h-11 bg-white/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50 border border-white/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Meal Plan</h1>
            <p className="text-gray-500 text-sm flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {weekPlans.length} days of recipes
            </p>
          </div>
        </div>
        <motion.button
          onClick={handleRefresh}
          animate={{ rotate: isRefreshing ? 360 : 0 }}
          transition={{ duration: 0.5 }}
          className="w-11 h-11 bg-white/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50 border border-white/60 active:scale-95 transition-transform"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'opacity-50' : ''}`} />
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 mb-8"
      >
        {/* Calories */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg shadow-gray-200/50 border border-white/60">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-900 text-xl font-bold">{avgDailyCalories}</p>
          <p className="text-gray-400 text-[11px] font-medium">avg cal/day</p>
        </div>

        {/* Total Meals */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg shadow-gray-200/50 border border-white/60">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0CC5BA] to-blue-500 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-[#0CC5BA]/30">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-900 text-xl font-bold">{totalMeals}</p>
          <p className="text-gray-400 text-[11px] font-medium">total meals</p>
        </div>

        {/* Progress */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg shadow-gray-200/50 border border-white/60">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-purple-500/30">
            <Target className="w-5 h-5 text-white" />
          </div>
          <p className="text-gray-900 text-xl font-bold">{Math.round((completedMeals / totalMeals) * 100) || 0}%</p>
          <p className="text-gray-400 text-[11px] font-medium">completed</p>
        </div>
      </motion.div>

      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center justify-between mb-4"
      >
        <h2 className="text-lg font-bold text-gray-900">Weekly Schedule</h2>
        <span className="text-xs text-gray-400 font-medium">{format(new Date(), "MMM yyyy")}</span>
      </motion.div>

      {/* Daily Meal Plans */}
      <div className="space-y-3 mb-8">
        {weekPlans.map((day: any, dayIndex: number) => {
          const dayDate = new Date(day.date);
          const isExpanded = expandedDay === day.date;
          const dayMeals = day.meals || [];
          const isTodayDate = isToday(dayDate);
          const completedCount = dayMeals.filter((m: any) => m.completed).length;

          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + dayIndex * 0.03 }}
            >
              <div className={`bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg border transition-all duration-300 ${
                isTodayDate 
                  ? "border-[#0CC5BA]/40 shadow-[#0CC5BA]/10 ring-1 ring-[#0CC5BA]/20" 
                  : "border-white/60 shadow-gray-200/50"
              }`}>
                {/* Day Header */}
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                  className="w-full p-4 flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-4">
                    {/* Date Badge */}
                    <div className={`relative text-center rounded-2xl p-2.5 min-w-[3.5rem] transition-all ${
                      isTodayDate 
                        ? "bg-gradient-to-br from-[#0CC5BA] to-blue-500 shadow-lg shadow-[#0CC5BA]/40" 
                        : "bg-gray-100/80 group-hover:bg-gray-200/80"
                    }`}>
                      {isTodayDate && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                      )}
                      <p className={`text-[10px] uppercase font-bold tracking-wider ${
                        isTodayDate ? "text-white/90" : "text-gray-400"
                      }`}>
                        {format(dayDate, "EEE")}
                      </p>
                      <p className={`text-xl font-bold leading-none mt-0.5 ${
                        isTodayDate ? "text-white" : "text-gray-700"
                      }`}>
                        {format(dayDate, "d")}
                      </p>
                    </div>
                    
                    {/* Day Info */}
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-900 font-bold">
                          {getDayLabel(dayDate)}
                        </p>
                        {isTodayDate && (
                          <span className="text-[10px] font-bold text-white bg-gradient-to-r from-[#0CC5BA] to-blue-500 px-2.5 py-0.5 rounded-full shadow-sm">
                            TODAY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="flex items-center text-xs text-gray-500 font-medium">
                          <Flame className="w-3.5 h-3.5 text-orange-400 mr-1" />
                          {day.totalCalories} cal
                        </span>
                        <span className="flex items-center text-xs text-gray-400">
                          <UtensilsCrossed className="w-3 h-3 mr-1" />
                          {dayMeals.length} meals
                        </span>
                        {completedCount > 0 && (
                          <span className="flex items-center text-xs text-green-500 font-medium">
                            <Check className="w-3 h-3 mr-0.5" />
                            {completedCount}/{dayMeals.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isExpanded ? 'bg-[#0CC5BA]/10' : 'bg-gray-100/80 group-hover:bg-gray-200/80'
                    }`}
                  >
                    <ChevronRight className={`w-5 h-5 transition-colors ${
                      isExpanded ? 'text-[#0CC5BA]' : 'text-gray-400'
                    }`} />
                  </motion.div>
                </button>

                {/* Meals List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-4 pb-4 space-y-2.5 border-t border-gray-100/80 pt-3">
                        {dayMeals.map((meal: any, mealIndex: number) => {
                          const isMealExpanded = expandedMeal === meal.id;
                          const nutrition = meal.recipe?.nutritionInfo;
                          const mealKey = meal.mealType?.toLowerCase() || 'snack';
                          const mealConfig = mealTypeConfig[mealKey] || mealTypeConfig.snack;
                          const MealIcon = mealConfig.icon;

                          return (
                            <motion.div
                              key={meal.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: mealIndex * 0.05 }}
                              className={`bg-gradient-to-r from-white to-gray-50/50 rounded-2xl overflow-hidden border transition-all ${
                                isMealExpanded ? 'border-[#0CC5BA]/30 shadow-md' : 'border-gray-100'
                              }`}
                            >
                              {/* Meal Header */}
                              <button
                                onClick={() => setExpandedMeal(isMealExpanded ? null : meal.id)}
                                className="w-full p-3.5 flex items-center space-x-3"
                              >
                                {/* Meal Type Icon */}
                                <div className={`w-12 h-12 bg-gradient-to-br ${mealConfig.gradient} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                                  <MealIcon className="w-5 h-5 text-white" />
                                </div>
                                
                                {/* Meal Info */}
                                <div className="flex-1 text-left min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${mealConfig.color}`}>
                                      {getMealTypeLabel(meal.mealType)}
                                    </span>
                                    {meal.completed && (
                                      <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-900 font-semibold text-sm leading-tight mt-0.5 truncate">
                                    {meal.name}
                                  </p>
                                  {nutrition && (
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
                                        {nutrition.calories} cal
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        P{nutrition.protein}g • C{nutrition.carbs}g • F{nutrition.fat}g
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <motion.div
                                  animate={{ rotate: isMealExpanded ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-shrink-0"
                                >
                                  <ChevronRight className={`w-5 h-5 transition-colors ${
                                    isMealExpanded ? 'text-[#0CC5BA]' : 'text-gray-300'
                                  }`} />
                                </motion.div>
                              </button>

                              {/* Meal Details */}
                              <AnimatePresence>
                                {isMealExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                  >
                                    <div className="px-4 pb-4 pt-2 space-y-4 bg-gradient-to-b from-gray-50/50 to-white border-t border-gray-100/80">
                                      {/* Quick Stats */}
                                      <div className="flex items-center gap-3 flex-wrap">
                                        {meal.recipe?.prepTime && (
                                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                                            <Clock className="w-3.5 h-3.5 text-[#0CC5BA]" />
                                            {meal.recipe.prepTime} min
                                          </div>
                                        )}
                                        {nutrition && (
                                          <>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                              {nutrition.protein}g protein
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                              {nutrition.carbs}g carbs
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* Ingredients */}
                                      {meal.recipe?.ingredients?.length > 0 && (
                                        <div>
                                          <h4 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-2.5 flex items-center">
                                            <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-[#0CC5BA]" />
                                            Ingredients
                                          </h4>
                                          <div className="grid grid-cols-2 gap-1.5">
                                            {meal.recipe.ingredients.slice(0, 6).map((ingredient: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="text-gray-600 text-xs flex items-center gap-2 bg-white px-2.5 py-2 rounded-lg border border-gray-100"
                                              >
                                                <span className="w-1 h-1 bg-[#0CC5BA] rounded-full flex-shrink-0" />
                                                <span className="truncate">
                                                  {typeof ingredient === "string"
                                                    ? ingredient
                                                    : `${ingredient.quantity} ${ingredient.name}`}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                          {meal.recipe.ingredients.length > 6 && (
                                            <p className="text-xs text-gray-400 mt-2 text-center">
                                              +{meal.recipe.ingredients.length - 6} more ingredients
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {/* Start Cooking Button */}
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLocation(`/cooking-mode/${meal.id}`);
                                        }}
                                        className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-[#0CC5BA]/30 active:scale-[0.98] transition-transform"
                                      >
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Cooking Mode
                                      </Button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 pb-8"
      >
        <Button
          onClick={() => setLocation("/recipes?tab=meal-plan#grocery-list")}
          className="w-full bg-white/80 backdrop-blur-xl hover:bg-white text-gray-700 border border-gray-200/60 py-5 text-sm font-semibold rounded-2xl shadow-lg shadow-gray-200/50 active:scale-[0.98] transition-all"
        >
          <ShoppingBag className="w-5 h-5 mr-2 text-[#0CC5BA]" />
          View Shopping List
        </Button>
        <Button
          onClick={() => setLocation("/meal-planning-quiz")}
          className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90 text-white py-5 text-sm font-semibold rounded-2xl shadow-xl shadow-[#0CC5BA]/30 active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate New Plan
        </Button>
      </motion.div>
    </BaseLayout>
  );
}
