import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight,
  Flame, 
  ShoppingBag, 
  Clock,
  Sparkles,
  ChefHat,
  UtensilsCrossed,
  Play,
  RefreshCw,
  Calendar,
  Target,
  Coffee,
  Sun,
  Moon,
  Apple,
  Check
} from "lucide-react";
import { useAllMealPlans } from "@/hooks/queries/useMealPlans";
import { createInvalidator } from "@/lib/queryUtils";

interface Meal {
  id: number;
  name: string;
  mealType: string;
  imageUrl?: string;
  completed?: boolean;
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

interface MealPlanViewContentProps {
  showHeader?: boolean;
}

export default function MealPlanViewContent({ showHeader = false }: MealPlanViewContentProps) {
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
      <div className="flex items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6"
        >
          <div className="relative w-20 h-20 mx-auto mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-[#0CC5BA]/20 border-t-[#0CC5BA]"
            />
            <div className="absolute inset-2 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-sm font-medium">Loading meal plan...</p>
        </motion.div>
      </div>
    );
  }

  // Empty/Error State
  if (isError || !mealPlansData || mealPlansData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 px-4"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0CC5BA]/30">
          <ChefHat className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-gray-900 text-xl font-bold mb-2">No Meal Plan Yet</h2>
        <p className="text-gray-500 mb-6 text-sm max-w-xs mx-auto">
          Create a personalized meal plan tailored to your nutrition goals
        </p>
        <Button
          onClick={() => setLocation("/meal-planning-quiz")}
          className="bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] hover:from-[#0CC5BA]/90 hover:to-[#26A8FF]/90 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#0CC5BA]/30"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Create Meal Plan
        </Button>
      </motion.div>
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
    <>
      {/* Header (optional) */}
      {showHeader && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Meal Plan</h2>
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {weekPlans.length} days of recipes
            </p>
          </div>
          <motion.button
            onClick={handleRefresh}
            animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{ duration: 0.5 }}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'opacity-50' : ''}`} />
          </motion.button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        {/* Calories */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center mb-2 shadow-sm">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <p className="text-gray-900 text-lg font-bold">{avgDailyCalories}</p>
          <p className="text-gray-400 text-[10px] font-medium">avg cal/day</p>
        </div>

        {/* Total Meals */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] rounded-lg flex items-center justify-center mb-2 shadow-sm">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <p className="text-gray-900 text-lg font-bold">{totalMeals}</p>
          <p className="text-gray-400 text-[10px] font-medium">total meals</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mb-2 shadow-sm">
            <Target className="w-4 h-4 text-white" />
          </div>
          <p className="text-gray-900 text-lg font-bold">{Math.round((completedMeals / totalMeals) * 100) || 0}%</p>
          <p className="text-gray-400 text-[10px] font-medium">completed</p>
        </div>
      </motion.div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Weekly Schedule</h3>
        <span className="text-[10px] text-gray-400 font-medium">{format(new Date(), "MMM yyyy")}</span>
      </div>

      {/* Daily Meal Plans */}
      <div className="space-y-2.5 mb-6">
        {weekPlans.map((day: any, dayIndex: number) => {
          const dayDate = new Date(day.date);
          const isExpanded = expandedDay === day.date;
          const dayMeals = day.meals || [];
          const isTodayDate = isToday(dayDate);
          const completedCount = dayMeals.filter((m: any) => m.completed).length;

          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.03 }}
            >
              <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all ${
                isTodayDate 
                  ? "border-[#0CC5BA]/40 ring-1 ring-[#0CC5BA]/20" 
                  : "border-gray-100"
              }`}>
                {/* Day Header */}
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                  className="w-full p-3 flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    {/* Date Badge */}
                    <div className={`relative text-center rounded-xl p-2 min-w-[2.75rem] transition-all ${
                      isTodayDate 
                        ? "bg-gradient-to-br from-[#0CC5BA] to-[#26A8FF] shadow-md shadow-[#0CC5BA]/30" 
                        : "bg-gray-100 group-hover:bg-gray-200"
                    }`}>
                      {isTodayDate && (
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white animate-pulse" />
                      )}
                      <p className={`text-[9px] uppercase font-bold tracking-wider ${
                        isTodayDate ? "text-white/90" : "text-gray-400"
                      }`}>
                        {format(dayDate, "EEE")}
                      </p>
                      <p className={`text-lg font-bold leading-none mt-0.5 ${
                        isTodayDate ? "text-white" : "text-gray-700"
                      }`}>
                        {format(dayDate, "d")}
                      </p>
                    </div>
                    
                    {/* Day Info */}
                    <div className="text-left">
                      <div className="flex items-center space-x-1.5">
                        <p className="text-gray-900 font-semibold text-sm">
                          {getDayLabel(dayDate)}
                        </p>
                        {isTodayDate && (
                          <span className="text-[8px] font-bold text-white bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] px-1.5 py-0.5 rounded-full">
                            TODAY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="flex items-center text-[10px] text-gray-500 font-medium">
                          <Flame className="w-3 h-3 text-orange-400 mr-0.5" />
                          {day.totalCalories} cal
                        </span>
                        <span className="flex items-center text-[10px] text-gray-400">
                          <UtensilsCrossed className="w-2.5 h-2.5 mr-0.5" />
                          {dayMeals.length} meals
                        </span>
                        {completedCount > 0 && (
                          <span className="flex items-center text-[10px] text-green-500 font-medium">
                            <Check className="w-2.5 h-2.5 mr-0.5" />
                            {completedCount}/{dayMeals.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isExpanded ? 'bg-[#0CC5BA]/10' : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}
                  >
                    <ChevronRight className={`w-4 h-4 transition-colors ${
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
                      <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
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
                              className={`bg-gray-50 rounded-xl overflow-hidden border transition-all ${
                                isMealExpanded ? 'border-[#0CC5BA]/30 shadow-sm' : 'border-transparent'
                              }`}
                            >
                              {/* Meal Header */}
                              <button
                                onClick={() => setExpandedMeal(isMealExpanded ? null : meal.id)}
                                className="w-full p-3 flex items-center space-x-3"
                              >
                                {/* Meal Type Icon */}
                                <div className={`w-10 h-10 bg-gradient-to-br ${mealConfig.gradient} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0`}>
                                  <MealIcon className="w-4 h-4 text-white" />
                                </div>
                                
                                {/* Meal Info */}
                                <div className="flex-1 text-left min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] uppercase font-bold tracking-wider ${mealConfig.color}`}>
                                      {getMealTypeLabel(meal.mealType)}
                                    </span>
                                    {meal.completed && (
                                      <span className="w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                                        <Check className="w-2 h-2 text-white" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-900 font-semibold text-xs leading-tight mt-0.5 truncate">
                                    {meal.name}
                                  </p>
                                  {nutrition && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                        {nutrition.calories} cal
                                      </span>
                                      <span className="text-[9px] text-gray-400">
                                        P{nutrition.protein}g • C{nutrition.carbs}g
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <motion.div
                                  animate={{ rotate: isMealExpanded ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-shrink-0"
                                >
                                  <ChevronRight className={`w-4 h-4 transition-colors ${
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
                                    <div className="px-3 pb-3 pt-1 space-y-3 border-t border-gray-200/50">
                                      {/* Quick Stats */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {meal.recipe?.prepTime && (
                                          <div className="flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-white px-2 py-1 rounded-md border border-gray-100">
                                            <Clock className="w-3 h-3 text-[#0CC5BA]" />
                                            {meal.recipe.prepTime} min
                                          </div>
                                        )}
                                        {nutrition && (
                                          <div className="flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                            {nutrition.protein}g protein
                                          </div>
                                        )}
                                      </div>

                                      {/* Ingredients Preview */}
                                      {meal.recipe?.ingredients?.length > 0 && (
                                        <div>
                                          <h4 className="text-gray-900 font-bold text-[10px] uppercase tracking-wider mb-1.5 flex items-center">
                                            <ShoppingBag className="w-3 h-3 mr-1 text-[#0CC5BA]" />
                                            Ingredients ({meal.recipe.ingredients.length})
                                          </h4>
                                          <div className="flex flex-wrap gap-1">
                                            {meal.recipe.ingredients.slice(0, 4).map((ingredient: any, idx: number) => (
                                              <span
                                                key={idx}
                                                className="text-gray-600 text-[10px] bg-white px-2 py-1 rounded-md border border-gray-100"
                                              >
                                                {typeof ingredient === "string"
                                                  ? ingredient.split(' ').slice(0, 2).join(' ')
                                                  : ingredient.name}
                                              </span>
                                            ))}
                                            {meal.recipe.ingredients.length > 4 && (
                                              <span className="text-gray-400 text-[10px] px-2 py-1">
                                                +{meal.recipe.ingredients.length - 4} more
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Start Cooking Button */}
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLocation(`/cooking-mode/${meal.id}`);
                                        }}
                                        className="w-full bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] hover:from-[#0CC5BA]/90 hover:to-[#26A8FF]/90 text-white py-2.5 rounded-lg font-semibold text-xs shadow-md shadow-[#0CC5BA]/30"
                                      >
                                        <Play className="w-3.5 h-3.5 mr-1.5" />
                                        Start Cooking
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

      {/* Action Button */}
      <Button
        onClick={() => setLocation("/meal-planning-quiz")}
        className="w-full bg-gradient-to-r from-[#0CC5BA] to-[#26A8FF] hover:from-[#0CC5BA]/90 hover:to-[#26A8FF]/90 text-white py-4 text-sm font-semibold rounded-xl shadow-lg shadow-[#0CC5BA]/30"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate New Plan
      </Button>
    </>
  );
}
