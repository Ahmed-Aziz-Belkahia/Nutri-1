import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Camera, Heart, Zap, ChevronRight,
  Loader2, Flame, Bell, Search, 
  User, Star, Trophy, Target,
  CalendarDays, UtensilsCrossed, Utensils, Clock,
  Scale, Activity, BarChart3
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useFoodLog } from "../hooks/use-food-log";
import { useUser } from "../hooks/use-user";
import { Suspense, lazy } from "react";
import useEmblaCarousel from 'embla-carousel-react';
import MacroChart from "@/components/MacroChart";
import { TodaysMealPlans } from "@/components/TodaysMealPlans";
import { format, parse, isValid } from 'date-fns';
// Dropdown menu removed - profile picture links directly to profile page

import { Progress } from "@/components/ui/progress";
import toast from 'react-hot-toast';
import { useUserProfile } from "@/hooks/use-user-profile";
import { useTranslation } from "react-i18next";
import { usePersistentGuide } from "@/hooks/use-persistent-guide";



// Load scanner component lazily - fix type issue with direct dynamic import
// @ts-ignore - Ignore the type mismatch for the lazy-loaded component
const ScannerUI = lazy(() => import("@/components/ScannerUI"));

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function getMealTime(date: Date, t: Function): string {
  const hour = date.getHours();
  if (hour < 10) return t('meals.breakfast');
  if (hour < 14) return t('meals.lunch');
  if (hour < 18) return t('meals.snack');
  return t('meals.dinner');
}

function getMealEmoji(mealType: string, t: Function): string {
  switch (mealType) {
    case t('meals.breakfast'): return "🍳";
    case t('meals.lunch'): return "🥗";
    case t('meals.snack'): return "🍎";
    case t('meals.dinner'): return "🍝";
    default: return "🍽️";
  }
}

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toFixed(0);
}

function getUsername(email: string): string {
  return email.split('@')[0];
}

function getDaysOfWeek(t: Function) {
  const today = new Date();
  // Start 3 days before today to put today in the middle (position 4)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 3);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dayNames = [
      t('days.sun'), 
      t('days.mon'), 
      t('days.tue'), 
      t('days.wed'), 
      t('days.thu'), 
      t('days.fri'), 
      t('days.sat')
    ];
    return {
      date,
      day: date.getDate(),
      dayName: dayNames[date.getDay()],
      isToday: date.toDateString() === today.toDateString()
    };
  });
}

// Enhanced helper functions
const formatFoodName = (log: any) => {
  // If the meal has a full name, use that directly
  const name = typeof log === 'string' ? log : log.name;
  
  // Check if the name already contains multiple components (with "with" format)
  // This is the case when the full name is already properly formatted
  if (name && name.toLowerCase().includes(' with ')) {
    // Just capitalize the first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  // If the log has components, combine them into a proper name
  if (log.components && Array.isArray(log.components) && log.components.length > 0) {
    if (log.components.length === 1) {
      // If only one component, use its name
      const componentName = log.components[0].name;
      return componentName.charAt(0).toUpperCase() + componentName.slice(1);
    } else {
      // For multiple components, construct a name like "Component1 with Component2 with Component3"
      const componentNames = log.components.map((comp: any) => comp.name);
      return componentNames.join(' with ');
    }
  }
  
  // Fallback to the original name formatting if no components
  const quantity = name.match(/^(\d+)\s*/);
  const foodName = name.replace(/^\d+\s*/, '').trim();
  const baseName = quantity && parseInt(quantity[1]) > 1
    ? foodName.replace(/s$/, '')
    : foodName;
  const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
  return quantity
    ? `${quantity[1]} ${formattedName}${parseInt(quantity[1]) > 1 ? 's' : ''}`
    : formattedName;
};

// Updated calculateTotal function to handle quantity properly
const calculateTotal = (name: string, value: string | number) => {
  // If the value is already a total (e.g. from API), return as is
  if (typeof value === 'string' && !name.match(/^\d+\s*/)) {
    return parseFloat(value);
  }

  const quantity = name.match(/^(\d+)\s*/);
  const baseValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(baseValue)) return 0;

  if (quantity) {
    return baseValue; // Value from API already includes quantity
  } else if (name.trim().endsWith('s')) {
    return baseValue; // Value from API already includes quantity
  }
  return baseValue;
};

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation(); // Add translation hook
  
  // Function to parse date from URL
  const getDateFromUrl = (url: string): Date => {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const dateParam = params.get('date');
    if (dateParam) {
      const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
  };

  // Initialize state with date from URL
  const [selectedDate, setSelectedDate] = useState<Date>(getDateFromUrl(location));
  
  // Update selectedDate whenever the URL changes
  useEffect(() => {
    const newDate = getDateFromUrl(location);
    setSelectedDate(newDate);
  }, [location]);
  const { foodLogs, isLoadingLogs, logFood, addFood } = useFoodLog(selectedDate);
  const { user } = useUser();
  // XP functionality removed
  const awardXP = async () => {}; // Empty function as placeholder

  // State for analyzing meal
  const [analyzingMeal, setAnalyzingMeal] = useState<{
    id: string;
    name: string;
    image: string;
    timestamp: Date;
  } | null>(null);

  // Handle pending food images from localStorage
  useEffect(() => {
    const pendingImage = localStorage.getItem('pendingFoodImage');
    const pendingName = localStorage.getItem('pendingFoodName');
    
    if (pendingImage && pendingName) {
      console.log('[Dashboard] Processing pending food image...');
      
      // Clear the pending data
      localStorage.removeItem('pendingFoodImage');
      localStorage.removeItem('pendingFoodName');
      
      // Create immediate visual placeholder
      const analyzingId = `analyzing-${Date.now()}`;
      setAnalyzingMeal({
        id: analyzingId,
        name: pendingName,
        image: pendingImage,
        timestamp: new Date()
      });
      
      // Start the actual analysis
      addFood({
        name: pendingName,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        image: pendingImage
      }).then(() => {
        // Clear the analyzing state when done
        setAnalyzingMeal(null);
      }).catch((error) => {
        console.error('[Dashboard] Failed to add pending food:', error);
        setAnalyzingMeal(null);
      });
    }
  }, [addFood]);
  const [likedMeals, setLikedMeals] = useState<Set<number>>(new Set());
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  const days = getDaysOfWeek(t);
  const { data: profile } = useUserProfile();

  const { isActive: isPersistentGuideActive } = usePersistentGuide();


  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDate = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleLike = (mealId: number) => {
    setLikedMeals(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(mealId)) {
        newLiked.delete(mealId);
      } else {
        newLiked.add(mealId);
      }
      return newLiked;
    });
  };

  const calorieGoal = profile?.caloriesGoal || 2000;

  // handleLogout function removed since profile pic now links directly to profile

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const formattedDate = format(date, 'yyyy-MM-dd');
    // Update URL without causing navigation
    const newUrl = `${window.location.pathname}?date=${formattedDate}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleFoodLog = async (data: any) => {
    try {
      console.log('Logging food:', data);
      await logFood(data);
      console.log('Food logged successfully, awarding XP');

      await new Promise(resolve => setTimeout(resolve, 500));

      await awardXP();
      console.log('XP awarded successfully');

      toast.success(t('toasts.foodLogSuccess'), {
        duration: 3000
      });
    } catch (error) {
      console.error("Failed to log food:", error);
      toast.error(t('toasts.foodLogError'), {
        duration: 3000
      });
    }
  };

  const processScannedFood = async (data: any) => {
    console.log("Scanned food data:", data);
    handleFoodLog(data);
  };

  // Update the handleScannerSuccess function
  const handleScannerSuccess = async (data: any) => {
    try {
      await processScannedFood(data);
      await awardXP();

      // Format ingredients into a list for recipe generation
      const ingredients = data.ingredients.map((ing: any) =>
        `${ing.quantity} ${ing.unit} of ${ing.name}`
      ).join(', ');

      // Call backend to generate recipes based on ingredients
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingredients: data.ingredients,
          prompt: `Generate 3 recipe suggestions that can be made with these ingredients: ${ingredients}. Include difficulty level, prep time, cooking time, primary flavor profile, and cuisine type for each recipe.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipes');
      }

      const recipeData = await response.json();

      // Prepare data for recipe results page
      const analysisData = {
        ingredients: data.ingredients || [],
        confidence: data.confidence || 0.9,
        suggestions: recipeData.recipes || []
      };

      console.log("Analysis data to encode:", analysisData);

      const encodedData = encodeURIComponent(JSON.stringify(analysisData));
      setLocation(`/recipe-results?data=${encodedData}`);
    } catch (error) {
      console.error("Failed to process scanned food:", error);
      toast.error(t("toasts.scanProcessError"), {
        duration: 3000
      });
    }
  };


  // Don't show full-screen loading - keep UI visible while fetching data

  const username = user?.email ? getUsername(user.email) : 'there';
  const todayTotals = {
    calories: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.calories), 0) || 0,
    protein: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.protein), 0) || 0,
    carbs: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.carbs), 0) || 0,
    fat: foodLogs?.reduce((sum, log) => sum + calculateTotal(log.name, log.fat), 0) || 0
  };
  // Calculate the actual percentage (can exceed 100%)
  const actualCaloriePercentage = Math.round((Number(todayTotals.calories || 0) / calorieGoal) * 100);
  // For display, we cap at 100% but keep the actual value for color logic
  const caloriePercentage = Math.min(actualCaloriePercentage, 100);

  // Level functionality removed - used to be based on XP

  // Update the macros array to use profile goals
  const macros = [
    {
      label: t('nutrition.carbs'),
      value: todayTotals.carbs,
      max: profile?.carbsGoal || 250,
      delay: 0
    },
    {
      label: t('nutrition.protein'),
      value: todayTotals.protein,
      max: profile?.proteinGoal || 150,
      delay: 0.2
    },
    {
      label: t('nutrition.fat'),
      value: todayTotals.fat,
      max: profile?.fatGoal || 65,
      delay: 0.4
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9f9f9] to-[#f0f4ff] relative overflow-hidden pb-20">
      
      {/* Colorful abstract shapes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-600/5 filter blur-3xl -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-500/5 filter blur-3xl translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/5 filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-pink-500/5 filter blur-3xl" />
    
      <div className="max-w-[600px] mx-auto relative z-10 pt-4 px-4">
        {/* Header with newer design matching recipes page */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 w-full bg-white/60 backdrop-blur-md z-10 border-b border-white/10 py-3 px-4 rounded-2xl mb-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent truncate"
              >
                {isToday(selectedDate) ? (
                  <>NutriAI</>
                ) : (
                  <>{format(selectedDate, 'MMMM d, yyyy')}</>
                )}
              </motion.h1>
            </div>

            <div className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative cursor-pointer"
                onClick={() => setLocation('/profile')}
                data-tutorial="profile-button"
              >
                <div className="relative">
                  <button
                    className="w-12 h-12 rounded-full bg-[#0CC5BA] flex items-center justify-center text-white text-xl font-semibold hover:bg-[#0CC5BA]/90 transition-colors overflow-hidden"
                  >
                    {user?.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{username[0].toUpperCase()}</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="pb-24 mx-auto"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-4 bg-white rounded-2xl shadow-md overflow-hidden relative"
          >
            {isLoadingLogs && (
              <div className="absolute top-2 right-2 z-10">
                <Loader2 className="h-4 w-4 animate-spin text-[#0CC5BA]" />
              </div>
            )}
            <div className="grid grid-cols-7 gap-0 p-0.5">
              {days.map((day, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleDateChange(day.date)}
                  className={`
                    relative flex flex-col items-center justify-center py-1.5 px-1 cursor-pointer
                    transition-all duration-200 group min-h-[48px] mx-0.5
                    ${isSelectedDate(day.date) ? 'bg-[#09b7b3] rounded-xl shadow-sm' : 'hover:bg-gray-100 rounded-xl'}
                  `}
                >
                  <span className={`text-xs font-medium transition-colors ${isSelectedDate(day.date) ? 'text-white' : 'text-[#09b7b3] group-hover:text-[#09b7b3]'}`}>
                    {day.dayName}
                  </span>
                  <span className={`text-lg font-bold transition-colors ${isSelectedDate(day.date) ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>
                    {day.day}
                  </span>

                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Revamped Calories Section */}
          <motion.div variants={itemVariants}>
            <Card className="mt-4 overflow-hidden border-none shadow-lg rounded-3xl bg-gradient-to-br from-white to-gray-50">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-[#09b7b3] to-[#0295c2] rounded-xl">
                      <Flame className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">{t('nutrition.calories')}</h2>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      todayTotals.calories >= calorieGoal
                        ? 'bg-green-100 text-green-700'
                        : todayTotals.calories >= calorieGoal * 0.8
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {todayTotals.calories >= calorieGoal ? 'Goal Reached' : 
                     todayTotals.calories >= calorieGoal * 0.8 ? 'Almost There' : 
                     'Keep Going'}
                  </motion.div>
                </div>

                {/* Main Calorie Display with Circular Progress */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-2">
                      <motion.span
                        key={todayTotals.calories}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold bg-gradient-to-r from-[#09b7b3] to-[#0295c2] bg-clip-text text-transparent"
                      >
                        {formatNumber(todayTotals.calories)}
                      </motion.span>
                      <span className="text-gray-500 font-medium">kcal</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      of <span className="font-semibold">{formatNumber(calorieGoal)}</span> daily goal
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {calorieGoal - todayTotals.calories > 0 ? (
                        <span className="text-[#09b7b3] font-semibold">
                          {formatNumber(calorieGoal - todayTotals.calories)} kcal remaining
                        </span>
                      ) : (
                        <span className="text-orange-500 font-semibold">
                          {formatNumber(todayTotals.calories - calorieGoal)} kcal over goal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Circular Progress Indicator */}
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#calorieGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                        animate={{ 
                          strokeDashoffset: 2 * Math.PI * 56 * (1 - Math.min(caloriePercentage / 100, 1))
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                      <defs>
                        <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#09b7b3" />
                          <stop offset="100%" stopColor="#0295c2" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        key={actualCaloriePercentage}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="text-2xl font-bold text-gray-800"
                      >
                        {actualCaloriePercentage}%
                      </motion.span>
                      <span className="text-xs text-gray-500">consumed</span>
                    </div>
                  </div>
                </div>

                {/* Macronutrients Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Macronutrients</h3>
                    <Link href="/nutrition">
                      <button className="text-xs text-[#09b7b3] hover:text-[#0295c2] font-medium flex items-center gap-1">
                        View Details
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </Link>
                  </div>

                  {/* Carbs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-sm font-medium text-gray-700">{t('nutrition.carbs')}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatNumber(todayTotals.carbs)}g
                        </span>
                        <span className="text-xs text-gray-500">/ {profile?.carbsGoal || 250}g</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${Math.min((todayTotals.carbs / (profile?.carbsGoal || 250)) * 100, 100)}%` 
                        }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Protein */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium text-gray-700">{t('nutrition.protein')}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatNumber(todayTotals.protein)}g
                        </span>
                        <span className="text-xs text-gray-500">/ {profile?.proteinGoal || 150}g</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${Math.min((todayTotals.protein / (profile?.proteinGoal || 150)) * 100, 100)}%` 
                        }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-700">{t('nutrition.fat')}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatNumber(todayTotals.fat)}g
                        </span>
                        <span className="text-xs text-gray-500">/ {profile?.fatGoal || 65}g</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${Math.min((todayTotals.fat / (profile?.fatGoal || 65)) * 100, 100)}%` 
                        }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Meals Logged</div>
                      <div className="text-lg font-semibold text-gray-800">
                        {foodLogs?.length || 0}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Avg per Meal</div>
                      <div className="text-lg font-semibold text-gray-800">
                        {foodLogs?.length > 0 
                          ? formatNumber(todayTotals.calories / foodLogs.length)
                          : '0'
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {todayTotals.calories >= calorieGoal ? 'Complete' : 
                         todayTotals.calories >= calorieGoal * 0.5 ? 'In Progress' : 'Started'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Revamped Today's Meals Section */}
          <motion.div variants={itemVariants} className="mt-6">
            <Card className="overflow-hidden border-none shadow-lg rounded-3xl bg-gradient-to-br from-white to-gray-50">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                      <Utensils className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800">{t('dashboard.todaysMeals')}</h2>
                  </div>
                  {foodLogs && foodLogs.length > 0 && (
                    <Link href="/food-logs">
                      <button className="text-xs text-[#09b7b3] hover:text-[#0295c2] font-medium flex items-center gap-1">
                        View All
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </Link>
                  )}
                </div>

                {(foodLogs && foodLogs.length > 0) || analyzingMeal ? (
                  <div className="space-y-3">
                    {/* Show analyzing meal card first if it exists */}
                    {analyzingMeal && (
                      <motion.div
                        key={analyzingMeal.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100"
                      >
                        <div className="flex items-center gap-4">
                          {/* Image */}
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                            {analyzingMeal.image && (
                              <img
                                src={analyzingMeal.image}
                                alt="Analyzing food"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-800 text-sm truncate">
                                {analyzingMeal.name}
                              </h3>
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {format(analyzingMeal.timestamp, 'HH:mm')}
                              </span>
                            </div>
                            <div className="text-xs text-blue-600 font-medium mb-2">
                              Analyzing nutritional content...
                            </div>
                            
                            {/* Animated loading bars */}
                            <div className="space-y-1">
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse" 
                                     style={{width: '60%'}} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Regular meal cards */}
                    {foodLogs?.map((log, index) => {
                      const mealType = getMealTime(new Date(log.createdAt), t);
                      const totalCalories = calculateTotal(log.name, log.calories);
                      const totalProtein = calculateTotal(log.name, log.protein);
                      const totalCarbs = calculateTotal(log.name, log.carbs);
                      const totalFat = calculateTotal(log.name, log.fat);
                      
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.01 }}
                          className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={() => setLocation(`/meal/${log.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            {/* Image or Meal Type Icon */}
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                              {log.image ? (
                                <img
                                  src={log.image}
                                  alt={log.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                                  <Utensils className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              {/* Meal type badge */}
                              <div className="absolute top-1 left-1 px-2 py-0.5 bg-white/90 backdrop-blur rounded-full">
                                <span className="text-[10px] font-semibold text-gray-700">
                                  {mealType}
                                </span>
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-800 text-sm truncate">
                                    {formatFoodName(log)}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500">
                                      {format(new Date(log.createdAt), 'HH:mm')}
                                    </span>
                                    {log.components && log.components.length > 0 && (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs text-gray-500">
                                          {log.components.length} items
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <div className="text-lg font-bold bg-gradient-to-r from-[#09b7b3] to-[#0295c2] bg-clip-text text-transparent">
                                    {formatNumber(totalCalories)}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-medium">KCAL</div>
                                </div>
                              </div>
                              
                              {/* Macro nutrients */}
                              <div className="flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                  <span className="text-gray-600">P: {formatNumber(totalProtein)}g</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                  <span className="text-gray-600">C: {formatNumber(totalCarbs)}g</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                  <span className="text-gray-600">F: {formatNumber(totalFat)}g</span>
                                </div>
                              </div>
                            </div>

                            {/* Action icon */}
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center">
                      <Utensils className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-gray-700 font-semibold mb-2">No meals logged yet</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                      Start tracking your nutrition by logging your first meal of the day
                    </p>
                    <Button
                      onClick={() => setLocation('/add-food')}
                      className="bg-gradient-to-r from-[#09b7b3] to-[#0295c2] hover:from-[#09b7b3]/90 hover:to-[#0295c2]/90 text-white px-6 py-2.5 rounded-xl shadow-md font-medium"
                      data-tutorial="log-food-button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Log Your First Meal
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>





          <motion.div variants={itemVariants} className="mt-8" data-tutorial="meal-plans-section">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-br from-[#0CC5BA] via-[#0CBACC] to-[#0C9CCC] bg-clip-text text-transparent">
                  {t('mealPlan.title')}
                </h2>
              </div>

            </div>
            <TodaysMealPlans selectedDate={selectedDate} />
          </motion.div>
        </motion.main>



      </div>
    </div>
  );
}