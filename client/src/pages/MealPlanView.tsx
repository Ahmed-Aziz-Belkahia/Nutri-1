import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek } from "date-fns";
import BaseLayout from "@/components/layouts/BaseLayout";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  ShoppingBag, 
  Check, 
  Clock,
  Utensils
} from "lucide-react";
import { Card } from "@/components/ui/card";

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

  // Fetch all meal plans
  const { data: mealPlansData, isLoading } = useQuery<MealPlansResponse>({
    queryKey: ["/api/meal-plans/all"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans/all", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch meal plans");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <BaseLayout showHeader={false}>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Loading your meal plan...</p>
          </motion.div>
        </div>
      </BaseLayout>
    );
  }

  if (!mealPlansData?.plans || mealPlansData.plans.length === 0) {
    return (
      <BaseLayout showHeader={false}>
        <div className="flex items-center justify-center min-h-screen px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-white text-lg mb-6">No meal plan found</p>
            <Button
              onClick={() => setLocation("/meal-planning-quiz-new")}
              className="bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90"
            >
              Create a Meal Plan
            </Button>
          </motion.div>
        </div>
      </BaseLayout>
    );
  }

  // Get the week's plans (latest 7 days)
  const weekPlans = mealPlansData.plans.slice(-7);
  const firstDate = weekPlans[0]?.date ? new Date(weekPlans[0].date) : new Date();
  const lastDate = weekPlans[weekPlans.length - 1]?.date 
    ? new Date(weekPlans[weekPlans.length - 1].date) 
    : addDays(firstDate, 6);

  const totalWeekCalories = weekPlans.reduce((sum, day) => sum + (day.totalCalories || 0), 0);
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

  const getMealTypeIcon = (mealType: string) => {
    const type = mealType.toLowerCase();
    if (type === "breakfast") return "🌅";
    if (type === "lunch") return "🌞";
    if (type === "dinner") return "🌙";
    return "🍎";
  };

  return (
    <BaseLayout showHeader={false} className="pb-32">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-gradient-to-r from-[#0CC5BA] to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Your Meal Plan is Ready!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/80 text-lg"
        >
          {format(firstDate, "MMM d")} - {format(lastDate, "MMM d, yyyy")}
        </motion.p>
      </motion.div>

      {/* Week Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-white/60 text-sm">Avg Daily Calories</p>
              <p className="text-white text-2xl font-bold">{avgDailyCalories}</p>
            </div>
            <div className="text-center">
              <Utensils className="w-6 h-6 text-[#0CC5BA] mx-auto mb-2" />
              <p className="text-white/60 text-sm">Total Meals</p>
              <p className="text-white text-2xl font-bold">
                {weekPlans.reduce((sum, day) => sum + (day.meals?.length || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Daily Meal Plans */}
      <div className="space-y-4 mb-6">
        {weekPlans.map((day, dayIndex) => {
          const dayDate = new Date(day.date);
          const isExpanded = expandedDay === day.date;
          const dayMeals = day.meals || [];

          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + dayIndex * 0.1 }}
            >
              <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
                {/* Day Header */}
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-white/60 text-xs uppercase tracking-wider">
                        {format(dayDate, "EEE")}
                      </p>
                      <p className="text-white text-2xl font-bold">
                        {format(dayDate, "d")}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold text-lg">
                        {format(dayDate, "MMMM d")}
                      </p>
                      <div className="flex items-center space-x-2 text-white/60 text-sm">
                        <Flame className="w-4 h-4" />
                        <span>{day.totalCalories} cal</span>
                        <span>•</span>
                        <span>{dayMeals.length} meals</span>
                      </div>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-6 h-6 text-white/60" />
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
                      className="border-t border-white/10"
                    >
                      <div className="p-4 space-y-3">
                        {dayMeals.map((meal) => {
                          const isMealExpanded = expandedMeal === meal.id;
                          const nutrition = meal.recipe?.nutritionInfo;

                          return (
                            <Card
                              key={meal.id}
                              className="bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden"
                            >
                              {/* Meal Header */}
                              <button
                                onClick={() =>
                                  setExpandedMeal(isMealExpanded ? null : meal.id)
                                }
                                className="w-full p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors"
                              >
                                {/* Meal Image */}
                                {meal.imageUrl && (
                                  <img
                                    src={meal.imageUrl}
                                    alt={meal.name}
                                    className="w-16 h-16 rounded-lg object-cover"
                                  />
                                )}
                                
                                {/* Meal Info */}
                                <div className="flex-1 text-left">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-lg">
                                      {getMealTypeIcon(meal.mealType)}
                                    </span>
                                    <span className="text-white/60 text-xs uppercase tracking-wider">
                                      {getMealTypeLabel(meal.mealType)}
                                    </span>
                                  </div>
                                  <p className="text-white font-semibold">
                                    {meal.name}
                                  </p>
                                  {nutrition && (
                                    <div className="flex items-center space-x-3 mt-1 text-xs text-white/60">
                                      <span>{nutrition.calories} cal</span>
                                      <span>•</span>
                                      <span>P: {nutrition.protein}g</span>
                                      <span>C: {nutrition.carbs}g</span>
                                      <span>F: {nutrition.fat}g</span>
                                    </div>
                                  )}
                                </div>

                                <motion.div
                                  animate={{ rotate: isMealExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <ChevronDown className="w-5 h-5 text-white/60" />
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
                                    className="border-t border-white/10 p-4 space-y-4"
                                  >
                                    {/* Prep Time */}
                                    {meal.recipe?.prepTime && (
                                      <div className="flex items-center space-x-2 text-white/60 text-sm">
                                        <Clock className="w-4 h-4" />
                                        <span>{meal.recipe.prepTime} min prep time</span>
                                      </div>
                                    )}

                                    {/* Ingredients */}
                                    {meal.recipe?.ingredients && meal.recipe.ingredients.length > 0 && (
                                      <div>
                                        <h4 className="text-white font-semibold mb-2 text-sm">
                                          Ingredients
                                        </h4>
                                        <ul className="space-y-1">
                                          {meal.recipe.ingredients.map((ingredient, idx) => (
                                            <li
                                              key={idx}
                                              className="text-white/70 text-sm flex items-start space-x-2"
                                            >
                                              <span className="text-[#0CC5BA] mt-1">•</span>
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
                                        <h4 className="text-white font-semibold mb-2 text-sm">
                                          Instructions
                                        </h4>
                                        <ol className="space-y-2">
                                          {meal.recipe.instructions.map((step, idx) => (
                                            <li
                                              key={idx}
                                              className="text-white/70 text-sm flex space-x-2"
                                            >
                                              <span className="text-[#0CC5BA] font-semibold min-w-[1.5rem]">
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
                            </Card>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="fixed bottom-20 left-0 right-0 px-5 max-w-md mx-auto space-y-3"
      >
        <Button
          onClick={() => setLocation("/groceries")}
          className="w-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/20 py-6 text-base font-medium"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          View Shopping List
        </Button>
        <Button
          onClick={() => setLocation("/")}
          className="w-full bg-gradient-to-r from-[#0CC5BA] to-blue-500 hover:from-[#0CC5BA]/90 hover:to-blue-500/90 text-white py-6 text-base font-medium"
        >
          <Check className="w-5 h-5 mr-2" />
          Start My Week
        </Button>
      </motion.div>
    </BaseLayout>
  );
}
